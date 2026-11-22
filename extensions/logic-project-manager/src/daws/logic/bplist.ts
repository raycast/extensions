import fs from "node:fs";

// 只读的二进制 plist（bplist00）解析器。Logic 的 ProjectInformation.plist、MetaData.plist 都是这种格式。
// 不调用 plutil：listSets 是同步的，每个项目都要读一次，开子进程太慢；也不用为此加依赖。

export type PlistDict = { [key: string]: PlistValue };
export type PlistValue = string | number | boolean | null | Date | Buffer | PlistValue[] | PlistDict;

const HEADER = "bplist00";
const TRAILER_SIZE = 32;
// plist 的日期从 2001-01-01（UTC）起算，单位是秒。
const PLIST_EPOCH_MS = Date.UTC(2001, 0, 1);

export function isPlistDict(value: PlistValue | undefined): value is PlistDict {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !Buffer.isBuffer(value)
  );
}

/** 解析二进制 plist。不是 bplist00 格式、或文件损坏时抛出。 */
export function parseBinaryPlist(buffer: Buffer): PlistValue {
  if (buffer.length < HEADER.length + TRAILER_SIZE || buffer.toString("latin1", 0, HEADER.length) !== HEADER) {
    throw new Error("Not a binary plist");
  }

  function checkRange(start: number, length: number) {
    if (!Number.isSafeInteger(start + length) || start < 0 || length < 0 || start + length > buffer.length) {
      throw new RangeError(`Binary plist read out of range: ${start} + ${length}`);
    }
  }

  // 大端无符号整数，最多 8 字节：偏移量、对象引用、长度都用它。
  function readUInt(start: number, size: number): number {
    checkRange(start, size);
    let value = 0;
    for (let i = 0; i < size; i++) value = value * 256 + buffer[start + i];
    return value;
  }

  // 整数对象：1、2、4 字节按无符号读，8 字节按有符号读；16 字节只用于超过 int64 的无符号数，取低 8 字节。
  function readInt(start: number, sizeExponent: number): number {
    if (sizeExponent <= 2) return readUInt(start, 1 << sizeExponent);
    if (sizeExponent === 3) {
      checkRange(start, 8);
      return Number(buffer.readBigInt64BE(start));
    }
    if (sizeExponent === 4) {
      checkRange(start, 16);
      return Number(buffer.readBigUInt64BE(start + 8));
    }
    throw new Error(`Unsupported plist integer size: 2^${sizeExponent}`);
  }

  // 文件末尾 32 字节：6 字节保留，然后依次是偏移量宽度、引用宽度、对象数、根对象编号、偏移表位置。
  const trailer = buffer.length - TRAILER_SIZE;
  const offsetSize = buffer[trailer + 6];
  const refSize = buffer[trailer + 7];
  if (offsetSize < 1 || offsetSize > 8 || refSize < 1 || refSize > 8) {
    throw new Error("Bad binary plist trailer");
  }
  const objectCount = readUInt(trailer + 8, 8);
  const topObject = readUInt(trailer + 16, 8);
  const offsetTable = readUInt(trailer + 24, 8);
  checkRange(offsetTable, objectCount * offsetSize);

  // 标记字节的低 4 位是长度；为 0xF 时，后面紧跟一个整数对象存真正的长度。返回长度和内容起点。
  function readLength(start: number, info: number): [number, number] {
    if (info !== 0x0f) return [info, start + 1];
    checkRange(start + 1, 1);
    const marker = buffer[start + 1];
    if (marker >> 4 !== 0x1) throw new Error("Bad binary plist length");
    const sizeExponent = marker & 0x0f;
    return [readInt(start + 2, sizeExponent), start + 2 + (1 << sizeExponent)];
  }

  function readRefs(start: number, count: number): number[] {
    checkRange(start, count * refSize);
    return Array.from({ length: count }, (_, i) => readUInt(start + i * refSize, refSize));
  }

  // 正在解析的对象编号：损坏的文件可能让数组或字典引用自己，遇到就报错，不无限递归。
  const visiting = new Set<number>();

  function readObject(ref: number): PlistValue {
    if (ref >= objectCount) throw new Error(`Bad binary plist reference: ${ref}`);
    if (visiting.has(ref)) throw new Error(`Cyclic binary plist reference: ${ref}`);
    visiting.add(ref);
    try {
      return decode(readUInt(offsetTable + ref * offsetSize, offsetSize));
    } finally {
      visiting.delete(ref);
    }
  }

  function decode(start: number): PlistValue {
    checkRange(start, 1);
    const marker = buffer[start];
    const info = marker & 0x0f;
    switch (marker >> 4) {
      case 0x0:
        // 0x08 false、0x09 true，其余（0x00 null、0x0F 填充）都当 null。
        if (info === 0x8) return false;
        if (info === 0x9) return true;
        return null;
      case 0x1:
        return readInt(start + 1, info);
      case 0x2:
        if (info === 2) {
          checkRange(start + 1, 4);
          return buffer.readFloatBE(start + 1);
        }
        if (info === 3) {
          checkRange(start + 1, 8);
          return buffer.readDoubleBE(start + 1);
        }
        throw new Error(`Unsupported plist real size: 2^${info}`);
      case 0x3:
        checkRange(start + 1, 8);
        return new Date(PLIST_EPOCH_MS + buffer.readDoubleBE(start + 1) * 1000);
      case 0x4: {
        const [length, contentStart] = readLength(start, info);
        checkRange(contentStart, length);
        return Buffer.from(buffer.subarray(contentStart, contentStart + length));
      }
      case 0x5: {
        // ASCII 字符串，长度按字节计。
        const [length, contentStart] = readLength(start, info);
        checkRange(contentStart, length);
        return buffer.toString("latin1", contentStart, contentStart + length);
      }
      case 0x6: {
        // UTF-16 大端字符串，长度按 16 位单元计。Node 只有小端解码，先交换字节序。
        const [length, contentStart] = readLength(start, info);
        checkRange(contentStart, length * 2);
        return Buffer.from(buffer.subarray(contentStart, contentStart + length * 2))
          .swap16()
          .toString("utf16le");
      }
      case 0x8:
        // UID（NSKeyedArchiver 用的引用），Logic 这两个文件里没见过，按整数返回。
        return readUInt(start + 1, info + 1);
      case 0xa: {
        const [count, contentStart] = readLength(start, info);
        return readRefs(contentStart, count).map((ref) => readObject(ref));
      }
      case 0xd: {
        // 先是 count 个键的引用，再是 count 个值的引用。
        const [count, contentStart] = readLength(start, info);
        const keyRefs = readRefs(contentStart, count);
        const valueRefs = readRefs(contentStart + count * refSize, count);
        const dict: PlistDict = {};
        keyRefs.forEach((keyRef, i) => {
          const key = readObject(keyRef);
          if (typeof key !== "string") throw new Error("Binary plist dictionary key is not a string");
          dict[key] = readObject(valueRefs[i]);
        });
        return dict;
      }
      default:
        throw new Error(`Unsupported binary plist object: 0x${marker.toString(16)}`);
    }
  }

  return readObject(topObject);
}

/** 同步读取并解析一个二进制 plist 文件。读不到或解析失败时抛出。 */
export function readPlistFile(filePath: string): PlistValue {
  return parseBinaryPlist(fs.readFileSync(filePath));
}
