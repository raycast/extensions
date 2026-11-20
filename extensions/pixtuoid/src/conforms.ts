import Ajv2020, { type AnySchema } from "ajv/dist/2020.js";

/** A committed `contract/*.schema.json` (draft 2020-12). */
export type Schema = AnySchema;

// A Tolerant Reader: `removeAdditional: true` drops only the properties an
// `additionalProperties: false` forbids (ajv docs/options.md), so a newer CLI's
// added field is ignored rather than failing an installed copy.
const ajv = new Ajv2020({ removeAdditional: true });

/** Whether `value` is an instance of `schema`. */
export function conforms(value: unknown, schema: Schema): boolean {
  return ajv.validate(schema, value) === true;
}

/** `out` parsed as rows each conforming to `schema`: the installed binary may be
 *  any version, and a cast checks nothing at runtime. All or nothing on purpose:
 *  a row outside the schema, a new `outcome` token included (the wire is
 *  published, so a new token needs a version handshake), is version skew the
 *  user fixes by updating, never a partial list. */
export function rowsOf<T>(out: string, schema: Schema, what: string): T[] {
  const rows: unknown = JSON.parse(out);
  if (!Array.isArray(rows) || !rows.every((row) => conforms(row, schema))) {
    throw new Error(`pixtuoid ${what} printed rows this extension can't read — update pixtuoid or the extension`);
  }
  return rows as T[];
}
