import { MongoClient, type Document } from "mongodb";

const SAMPLE_SIZE = 5;

export type MongoCollectionDdl = {
  tableDdls: Map<string, string>;
  tableTypes: Map<string, "table" | "view">;
};

/**
 * Infer a simple field-type summary from sample documents.
 */
function getValueTypeName(value: unknown): string {
  if (value === null) return "null";
  if (value instanceof Date) return "Date";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object" && value !== null) {
    const name = (value as { constructor?: { name?: string } }).constructor?.name;
    if (name) return name;
    return "object";
  }
  return typeof value;
}

function inferFieldsFromSamples(docs: Document[]): string[] {
  const fieldTypes = new Map<string, Set<string>>();
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc)) {
      if (!fieldTypes.has(key)) fieldTypes.set(key, new Set());
      fieldTypes.get(key)!.add(getValueTypeName(value));
    }
  }
  const lines: string[] = [];
  for (const [field, types] of Array.from(fieldTypes.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const typeStr = Array.from(types).sort().join(" | ");
    lines.push(`  ${field}: ${typeStr}`);
  }
  return lines;
}

/**
 * Build a human-readable "DDL" string for a MongoDB collection:
 * indexes + optional validator/$jsonSchema + inferred fields from sample.
 */
function buildCollectionDdl(
  collectionName: string,
  indexes: Document[],
  validator: Document | undefined,
  sampleFields: string[],
): string {
  const sections: string[] = [];

  sections.push(`# Collection: ${collectionName}`);
  sections.push("");

  if (indexes.length > 0) {
    sections.push("## Indexes");
    for (const idx of indexes) {
      const name = (idx.name as string) ?? "(unnamed)";
      const key = idx.key as Document;
      const keyStr = JSON.stringify(key);
      const extra: string[] = [];
      if (idx.unique) extra.push("unique");
      if (idx.expireAfterSeconds != null) extra.push(`expireAfterSeconds: ${idx.expireAfterSeconds}`);
      const suffix = extra.length > 0 ? ` (${extra.join(", ")})` : "";
      sections.push(`- \`${name}\`: ${keyStr}${suffix}`);
    }
    sections.push("");
  }

  if (validator && Object.keys(validator).length > 0) {
    sections.push("## Schema validation");
    sections.push("```json");
    sections.push(JSON.stringify(validator, null, 2));
    sections.push("```");
    sections.push("");
  }

  if (sampleFields.length > 0) {
    sections.push("## Inferred fields (from sample)");
    sections.push(...sampleFields);
  }

  return sections.join("\n").trimEnd();
}

/**
 * Fetch MongoDB schema: list collections, indexes, optional validator and sample docs;
 * return the same shape as Postgres buildSchemaDdl for cache compatibility.
 */
export async function fetchMongoSchema(connectionString: string): Promise<MongoCollectionDdl> {
  const client = new MongoClient(connectionString, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  try {
    const db = client.db();
    const dbName = db.databaseName;
    const tableDdls = new Map<string, string>();
    const tableTypes = new Map<string, "table" | "view">();

    const listOptions = { nameOnly: false as const };
    const collectionsCursor = db.listCollections({}, listOptions);
    const collInfos = await collectionsCursor.toArray();

    for (const info of collInfos) {
      const name = info.name as string;
      const type = (info.type as string) === "view" ? "view" : "table";
      const key = `${dbName}.${name}`;
      tableTypes.set(key, type);

      const options = info.options as Document | undefined;
      const validator = options?.validator as Document | undefined;

      const collection = db.collection(name);
      let indexes: Document[] = [];
      let sampleFields: string[] = [];
      try {
        indexes = await collection.listIndexes().toArray();
      } catch {
        // collection might be a view or dropped
      }
      if (type === "table") {
        try {
          const sample = await collection.find({}).limit(SAMPLE_SIZE).toArray();
          sampleFields = inferFieldsFromSamples(sample);
        } catch {
          // ignore
        }
      }

      const ddl = buildCollectionDdl(name, indexes, validator, sampleFields);
      tableDdls.set(key, ddl);
    }

    return { tableDdls, tableTypes };
  } finally {
    await client.close();
  }
}
