import { open, stat } from "fs/promises";

const PARQUET_MAGIC = "PAR1";
const MAX_FOOTER_BYTES = 16 * 1024 * 1024;
const MAX_SCHEMA_LINES = 80;

const COMPACT_STOP = 0;
const COMPACT_BOOLEAN_TRUE = 1;
const COMPACT_BOOLEAN_FALSE = 2;
const COMPACT_BYTE = 3;
const COMPACT_I16 = 4;
const COMPACT_I32 = 5;
const COMPACT_I64 = 6;
const COMPACT_DOUBLE = 7;
const COMPACT_BINARY = 8;
const COMPACT_LIST = 9;
const COMPACT_SET = 10;
const COMPACT_MAP = 11;
const COMPACT_STRUCT = 12;
const COMPACT_FLOAT = 13;

const PHYSICAL_TYPES = ["BOOLEAN", "INT32", "INT64", "INT96", "FLOAT", "DOUBLE", "BYTE_ARRAY", "FIXED_LEN_BYTE_ARRAY"];
const REPETITION_TYPES = ["required", "optional", "repeated"];

type SchemaElement = {
  name?: string;
  type?: number;
  repetitionType?: number;
  numChildren?: number;
};

type ParquetMetadata = {
  version?: number;
  schema: SchemaElement[];
  numRows?: number;
  rowGroups?: number;
  createdBy?: string;
};

class CompactReader {
  private offset = 0;

  constructor(private readonly buf: Buffer) {}

  private ensure(bytes: number) {
    if (this.offset + bytes > this.buf.length) throw new Error("Unexpected end of Parquet metadata");
  }

  private readByte(): number {
    this.ensure(1);
    return this.buf[this.offset++];
  }

  private readVarintBigInt(): bigint {
    let shift = 0n;
    let result = 0n;
    for (;;) {
      const b = BigInt(this.readByte());
      result |= (b & 0x7fn) << shift;
      if ((b & 0x80n) === 0n) return result;
      shift += 7n;
      if (shift > 70n) throw new Error("Invalid Parquet varint");
    }
  }

  private readVarint(): number {
    const n = this.readVarintBigInt();
    if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Parquet metadata value is too large");
    return Number(n);
  }

  private readZigZag(): number {
    const n = this.readVarintBigInt();
    const signed = (n >> 1n) ^ -(n & 1n);
    if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new Error("Parquet metadata value is too large");
    }
    return Number(signed);
  }

  private readString(): string {
    const len = this.readVarint();
    this.ensure(len);
    const value = this.buf.subarray(this.offset, this.offset + len).toString("utf8");
    this.offset += len;
    return value;
  }

  private readListHeader(): { elementType: number; size: number } {
    const header = this.readByte();
    let size = header >> 4;
    const elementType = header & 0x0f;
    if (size === 15) size = this.readVarint();
    return { elementType, size };
  }

  parseFileMetadata(): ParquetMetadata {
    const metadata: ParquetMetadata = { schema: [] };
    this.readStruct((fieldId, fieldType) => {
      if (fieldId === 1 && fieldType === COMPACT_I32) {
        metadata.version = this.readZigZag();
        return true;
      }
      if (fieldId === 2 && fieldType === COMPACT_LIST) {
        const { elementType, size } = this.readListHeader();
        if (elementType !== COMPACT_STRUCT) throw new Error("Invalid Parquet schema metadata");
        for (let i = 0; i < size; i++) metadata.schema.push(this.parseSchemaElement());
        return true;
      }
      if (fieldId === 3 && fieldType === COMPACT_I64) {
        metadata.numRows = this.readZigZag();
        return true;
      }
      if (fieldId === 4 && fieldType === COMPACT_LIST) {
        const { elementType, size } = this.readListHeader();
        metadata.rowGroups = size;
        for (let i = 0; i < size; i++) this.skip(elementType);
        return true;
      }
      if (fieldId === 6 && fieldType === COMPACT_BINARY) {
        metadata.createdBy = this.readString();
        return true;
      }
      return false;
    });
    return metadata;
  }

  private parseSchemaElement(): SchemaElement {
    const element: SchemaElement = {};
    this.readStruct((fieldId, fieldType) => {
      if (fieldId === 1 && fieldType === COMPACT_I32) {
        element.type = this.readZigZag();
        return true;
      }
      if (fieldId === 3 && fieldType === COMPACT_I32) {
        element.repetitionType = this.readZigZag();
        return true;
      }
      if (fieldId === 4 && fieldType === COMPACT_BINARY) {
        element.name = this.readString();
        return true;
      }
      if (fieldId === 5 && fieldType === COMPACT_I32) {
        element.numChildren = this.readZigZag();
        return true;
      }
      return false;
    });
    return element;
  }

  private readStruct(onField: (fieldId: number, fieldType: number) => boolean) {
    let previousFieldId = 0;
    for (;;) {
      const header = this.readByte();
      const fieldType = header & 0x0f;
      if (fieldType === COMPACT_STOP) return;
      const delta = header >> 4;
      const fieldId = delta === 0 ? this.readZigZag() : previousFieldId + delta;
      previousFieldId = fieldId;
      if (!onField(fieldId, fieldType)) this.skip(fieldType);
    }
  }

  private skip(type: number) {
    if (type === COMPACT_BOOLEAN_TRUE || type === COMPACT_BOOLEAN_FALSE || type === COMPACT_STOP) return;
    if (type === COMPACT_BYTE) {
      this.ensure(1);
      this.offset += 1;
      return;
    }
    if (type === COMPACT_I16 || type === COMPACT_I32 || type === COMPACT_I64) {
      this.readVarintBigInt();
      return;
    }
    if (type === COMPACT_DOUBLE) {
      this.ensure(8);
      this.offset += 8;
      return;
    }
    if (type === COMPACT_FLOAT) {
      this.ensure(4);
      this.offset += 4;
      return;
    }
    if (type === COMPACT_BINARY) {
      const len = this.readVarint();
      this.ensure(len);
      this.offset += len;
      return;
    }
    if (type === COMPACT_LIST || type === COMPACT_SET) {
      const { elementType, size } = this.readListHeader();
      for (let i = 0; i < size; i++) this.skip(elementType);
      return;
    }
    if (type === COMPACT_MAP) {
      const size = this.readVarint();
      if (size === 0) return;
      const types = this.readByte();
      const keyType = types >> 4;
      const valueType = types & 0x0f;
      for (let i = 0; i < size; i++) {
        this.skip(keyType);
        this.skip(valueType);
      }
      return;
    }
    if (type === COMPACT_STRUCT) {
      this.readStruct(() => false);
      return;
    }
    throw new Error(`Unsupported Parquet metadata field type ${type}`);
  }
}

function formatNumber(n?: number): string {
  return n === undefined ? "unknown" : new Intl.NumberFormat().format(n);
}

function schemaType(element: SchemaElement): string {
  return element.type === undefined ? "group" : (PHYSICAL_TYPES[element.type] ?? `type ${element.type}`);
}

function formatSchema(schema: SchemaElement[]): string[] {
  if (schema.length <= 1) return [];
  const lines: string[] = [];
  let index = 1;

  function visit(depth: number) {
    if (index >= schema.length || lines.length >= MAX_SCHEMA_LINES) return;
    const element = schema[index++];
    const name = element.name ?? "(unnamed)";
    const repetition =
      element.repetitionType === undefined ? "" : `${REPETITION_TYPES[element.repetitionType] ?? "field"} `;
    lines.push(`${"  ".repeat(depth)}- ${name}: ${repetition}${schemaType(element)}`);
    for (let i = 0; i < (element.numChildren ?? 0); i++) visit(depth + 1);
  }

  const rootChildren = schema[0]?.numChildren ?? schema.length - 1;
  for (let i = 0; i < rootChildren && index < schema.length; i++) visit(0);
  if (index < schema.length || lines.length >= MAX_SCHEMA_LINES) lines.push("- ...");
  return lines;
}

export async function parquetPreviewMarkdown(filePath: string): Promise<string> {
  const s = await stat(filePath);
  if (s.size < 12) throw new Error("File is too small to be a Parquet file");
  const readLength = Math.min(s.size, MAX_FOOTER_BYTES);
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(readLength);
    await fh.read(buf, 0, readLength, s.size - readLength);
    if (buf.subarray(0, 4).toString("utf8") !== PARQUET_MAGIC && readLength === s.size) {
      throw new Error("Missing Parquet header");
    }
    if (buf.subarray(buf.length - 4).toString("utf8") !== PARQUET_MAGIC) throw new Error("Missing Parquet footer");

    const metadataLength = buf.readUInt32LE(buf.length - 8);
    if (metadataLength > buf.length - 8) throw new Error("Parquet footer is too large to preview");

    const metadataStart = buf.length - 8 - metadataLength;
    const metadata = new CompactReader(buf.subarray(metadataStart, metadataStart + metadataLength)).parseFileMetadata();
    const schemaLines = formatSchema(metadata.schema);
    const lines = [
      "\n**Parquet**\n",
      `- Rows: ${formatNumber(metadata.numRows)}`,
      `- Row groups: ${formatNumber(metadata.rowGroups)}`,
    ];
    if (metadata.createdBy) lines.push(`- Created by: ${metadata.createdBy}`);
    if (schemaLines.length) lines.push("\n**Schema**\n", ...schemaLines);
    return `${lines.join("\n")}\n`;
  } finally {
    await fh.close();
  }
}
