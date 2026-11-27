/**
 * Avro schema and datum checks for the Avro Schema Tools page, following the
 * Apache Avro 1.11 specification. avro-js needs Node's util/buffer modules,
 * so the browser build uses this dependency-free checker instead; the tests
 * compare it against avro-js where the two use the same JSON conventions.
 *
 * Data is checked in "plain JSON" form: a union value is given directly
 * (30 or null), not wrapped as {"int": 30} like Avro's JSON encoding.
 */
import { msg, built } from '../msg';

const PRIMITIVES = ['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string'] as const;
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const INT_MIN = -(2 ** 31);
const INT_MAX = 2 ** 31 - 1;

type Named = { kind: 'record' | 'enum' | 'fixed'; schema: any };
type Registry = Map<string, Named>;

export type SchemaCheck = { errors: string[]; registry: Registry };

function fullName(name: string, namespace?: string): string {
  if (name.includes('.')) return name;
  return namespace ? `${namespace}.${name}` : name;
}

function checkName(name: unknown, path: string, errors: string[]) {
  if (typeof name !== 'string' || name.length === 0) {
    errors.push(built(msg('{path}: "name" must be a non-empty string'), { path }));
    return;
  }
  for (const part of name.split('.')) {
    if (!NAME_RE.test(part)) errors.push(built(msg('{path}: name "{name}" must match [A-Za-z_][A-Za-z0-9_]*'), { path, name }));
  }
}

/** Namespace for names inside a named type: a dotted name wins over the "namespace" attribute (Avro spec, "Names"). */
function innerNamespace(schema: { name?: unknown; namespace?: unknown } | null | undefined, outer: string | undefined): string | undefined {
  const name = typeof schema?.name === 'string' ? schema.name : '';
  if (name.includes('.')) return name.slice(0, name.lastIndexOf('.'));
  return typeof schema?.namespace === 'string' ? schema.namespace : outer;
}

function resolveRef(ref: string, namespace: string | undefined, registry: Registry): Named | undefined {
  return registry.get(fullName(ref, namespace)) ?? registry.get(ref);
}

/** Validates a parsed schema. Returns every problem found, not just the first. */
export function checkAvroSchema(schema: unknown): SchemaCheck {
  const errors: string[] = [];
  const registry: Registry = new Map();
  walk(schema, '$', undefined);
  return { errors, registry };

  function walk(s: any, path: string, ns: string | undefined): void {
    if (typeof s === 'string') {
      if ((PRIMITIVES as readonly string[]).includes(s)) return;
      if (!resolveRef(s, ns, registry)) errors.push(built(msg('{path}: unknown type "{type}"'), { path, type: s }));
      return;
    }
    if (Array.isArray(s)) {
      if (s.length === 0) errors.push(built(msg('{path}: a union must list at least one type'), { path }));
      const seen = new Set<string>();
      s.forEach((branch, i) => {
        if (Array.isArray(branch)) errors.push(built(msg('{path}[{i}]: unions may not contain other unions'), { path, i }));
        const key = unionKey(branch, ns);
        if (seen.has(key)) errors.push(built(msg('{path}[{i}]: union contains "{key}" more than once'), { path, i, key }));
        seen.add(key);
        walk(branch, `${path}[${i}]`, ns);
      });
      return;
    }
    if (!s || typeof s !== 'object') {
      errors.push(built(msg('{path}: a schema must be a type name, an object or a union array'), { path }));
      return;
    }
    const type = s.type;
    if ((PRIMITIVES as readonly string[]).includes(type)) return; // {"type": "string", "logicalType": ...}
    switch (type) {
      case 'record':
      case 'error': {
        checkName(s.name, path, errors);
        const childNs = typeof s.namespace === 'string' ? s.namespace : ns;
        const name = typeof s.name === 'string' ? fullName(s.name, childNs) : undefined;
        const recordNs = name && name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : childNs;
        if (name) register(name, { kind: 'record', schema: s }, path);
        if (!Array.isArray(s.fields)) {
          errors.push(built(msg('{path}: record "{name}" needs a "fields" array'), { path, name: s.name }));
          return;
        }
        const names = new Set<string>();
        s.fields.forEach((f: any, i: number) => {
          const fp = `${path}.fields[${i}]`;
          if (!f || typeof f !== 'object') {
            errors.push(built(msg('{field}: each field must be an object'), { field: fp }));
            return;
          }
          checkName(f.name, fp, errors);
          if (names.has(f.name)) errors.push(built(msg('{field}: duplicate field name "{name}"'), { field: fp, name: f.name }));
          names.add(f.name);
          if (f.type === undefined) {
            errors.push(built(msg('{field}: field "{name}" has no "type"'), { field: fp, name: f.name }));
            return;
          }
          walk(f.type, `${fp}.type`, recordNs);
          if (f.default !== undefined) {
            const problems: string[] = [];
            // Union defaults must match the first branch of the union.
            const target = Array.isArray(f.type) ? f.type[0] : f.type;
            checkDatum(target, f.default, `${fp}.default`, recordNs, registry, problems);
            if (problems.length) {
              errors.push(built(Array.isArray(f.type) ? msg('{field}: default {default} does not match the first union branch') : msg('{field}: default {default} does not match the field type'), { field: fp, default: String(JSON.stringify(f.default)) }));
            }
          }
        });
        return;
      }
      case 'enum': {
        checkName(s.name, path, errors);
        if (typeof s.name === 'string') register(fullName(s.name, s.namespace ?? ns), { kind: 'enum', schema: s }, path);
        if (!Array.isArray(s.symbols) || s.symbols.length === 0) {
          errors.push(built(msg('{path}: enum "{name}" needs a non-empty "symbols" array'), { path, name: s.name }));
          return;
        }
        const seen = new Set<string>();
        for (const sym of s.symbols) {
          if (typeof sym !== 'string' || !NAME_RE.test(sym)) errors.push(built(msg('{path}: enum symbol {symbol} is not a valid name'), { path, symbol: String(JSON.stringify(sym)) }));
          if (seen.has(sym)) errors.push(built(msg('{path}: enum symbol "{symbol}" is repeated'), { path, symbol: sym }));
          seen.add(sym);
        }
        return;
      }
      case 'fixed':
        checkName(s.name, path, errors);
        if (typeof s.name === 'string') register(fullName(s.name, s.namespace ?? ns), { kind: 'fixed', schema: s }, path);
        if (!Number.isInteger(s.size) || s.size < 0) errors.push(built(msg('{path}: fixed "{name}" needs an integer "size"'), { path, name: s.name }));
        return;
      case 'array':
        if (s.items === undefined) errors.push(built(msg('{path}: array needs an "items" schema'), { path }));
        else walk(s.items, `${path}.items`, ns);
        return;
      case 'map':
        if (s.values === undefined) errors.push(built(msg('{path}: map needs a "values" schema'), { path }));
        else walk(s.values, `${path}.values`, ns);
        return;
      default:
        if (typeof type === 'string' && resolveRef(type, ns, registry)) return;
        if (type === undefined) errors.push(built(msg('{path}: missing "type"'), { path }));
        else walk(type, `${path}.type`, ns);
    }
  }

  function register(name: string, named: Named, path: string) {
    if (registry.has(name)) errors.push(built(msg('{path}: type "{name}" is defined more than once'), { path, name }));
    registry.set(name, named);
  }

  function unionKey(branch: any, ns: string | undefined): string {
    if (typeof branch === 'string') return (PRIMITIVES as readonly string[]).includes(branch) ? branch : fullName(branch, ns);
    if (branch && typeof branch === 'object' && !Array.isArray(branch)) {
      if (['record', 'enum', 'fixed', 'error'].includes(branch.type) && typeof branch.name === 'string') {
        return fullName(branch.name, branch.namespace ?? ns);
      }
      return String(branch.type);
    }
    return 'union';
  }
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

/** Checks one value against a schema, pushing human-readable errors. */
function checkDatum(schema: any, value: unknown, path: string, ns: string | undefined, registry: Registry, errors: string[]): void {
  if (Array.isArray(schema)) {
    for (const branch of schema) {
      const branchErrors: string[] = [];
      checkDatum(branch, value, path, ns, registry, branchErrors);
      if (branchErrors.length === 0) return;
    }
    errors.push(built(msg('{path}: {value} does not match any branch of union [{branches}]'), { path, value: String(JSON.stringify(value)), branches: schema.map(describeType).join(', ') }));
    return;
  }
  if (schema && typeof schema === 'object') {
    const t = schema.type;
    if ((PRIMITIVES as readonly string[]).includes(t)) return checkDatum(t, value, path, ns, registry, errors);
    if (t === 'record' || t === 'error') return checkRecord(schema, value, path, ns, registry, errors);
    if (t === 'enum') {
      if (typeof value !== 'string' || !schema.symbols?.includes(value)) {
        errors.push(built(msg('{path}: expected one of {symbols}, got {value}'), { path, symbols: String(JSON.stringify(schema.symbols)), value: String(JSON.stringify(value)) }));
      }
      return;
    }
    if (t === 'fixed') {
      if (typeof value !== 'string' || value.length !== schema.size) {
        errors.push(built(msg('{path}: expected a {size}-byte fixed value (a string of {size} characters)'), { path, size: schema.size }));
      }
      return;
    }
    if (t === 'array') {
      if (!Array.isArray(value)) errors.push(built(msg('{path}: expected an array, got {got}'), { path, got: jsonType(value) }));
      else value.forEach((v, i) => checkDatum(schema.items, v, `${path}[${i}]`, ns, registry, errors));
      return;
    }
    if (t === 'map') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) errors.push(built(msg('{path}: expected an object (map), got {got}'), { path, got: jsonType(value) }));
      else for (const [k, v] of Object.entries(value)) checkDatum(schema.values, v, `${path}.${k}`, ns, registry, errors);
      return;
    }
    return checkDatum(t, value, path, ns, registry, errors);
  }
  switch (schema) {
    case 'null':
      if (value !== null) errors.push(built(msg('{path}: expected null, got {got}'), { path, got: jsonType(value) }));
      return;
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(built(msg('{path}: expected boolean, got {got}'), { path, got: jsonType(value) }));
      return;
    case 'int':
      if (!Number.isInteger(value) || (value as number) < INT_MIN || (value as number) > INT_MAX) {
        errors.push(built(msg('{path}: expected a 32-bit int ({min} to {max}), got {value}'), { path, min: INT_MIN, max: INT_MAX, value: String(JSON.stringify(value)) }));
      }
      return;
    case 'long':
      if (!Number.isSafeInteger(value)) {
        errors.push(built(msg("{path}: expected a long (an integer within JavaScript's safe range), got {value}"), { path, value: String(JSON.stringify(value)) }));
      }
      return;
    case 'float':
    case 'double':
      if (!isNumber(value)) errors.push(built(msg('{path}: expected a number, got {got}'), { path, got: jsonType(value) }));
      return;
    case 'bytes':
    case 'string':
      if (typeof value !== 'string') errors.push(built(msg('{path}: expected {schema}, got {got}'), { path, schema, got: jsonType(value) }));
      return;
    default: {
      const named = typeof schema === 'string' ? resolveRef(schema, ns, registry) : undefined;
      if (!named) {
        errors.push(built(msg('{path}: unknown type {schema}'), { path, schema: String(JSON.stringify(schema)) }));
        return;
      }
      checkDatum(named.schema, value, path, ns, registry, errors);
    }
  }
}

function checkRecord(schema: any, value: unknown, path: string, ns: string | undefined, registry: Registry, errors: string[], warnings?: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(built(msg('{path}: expected an object for record "{name}", got {got}'), { path, name: schema.name, got: jsonType(value) }));
    return;
  }
  const childNs = innerNamespace(schema, ns);
  const obj = value as Record<string, unknown>;
  for (const field of schema.fields ?? []) {
    const fp = path === '$' ? field.name : `${path}.${field.name}`;
    if (!Object.prototype.hasOwnProperty.call(obj, field.name)) {
      if (field.default !== undefined) warnings?.push(built(msg('{field} not provided, the reader will use the default {default}'), { field: fp, default: String(JSON.stringify(field.default)) }));
      else errors.push(built(msg('{field}: required field is missing (it has no default)'), { field: fp }));
      continue;
    }
    checkDatum(field.type, obj[field.name], fp, childNs, registry, errors);
  }
  if (warnings) {
    const declared = new Set((schema.fields ?? []).map((f: any) => f.name));
    for (const key of Object.keys(obj)) {
      if (!declared.has(key)) warnings.push(built(msg('{key} is not in the schema and would be dropped when writing'), { key }));
    }
  }
}

export function describeType(t: any): string {
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return t.map(describeType).join(' | ');
  if (t && typeof t === 'object') {
    if (t.type === 'array') return `array<${describeType(t.items)}>`;
    if (t.type === 'map') return `map<${describeType(t.values)}>`;
    if (t.name) return `${t.type} ${t.name}`;
    if (t.logicalType) return `${t.type} (${t.logicalType})`;
    return String(t.type);
  }
  return String(t);
}

function jsonType(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

export type DatumCheck = { valid: boolean; errors: string[]; warnings: string[] };

/** Validates a plain-JSON datum against a schema. Schema errors are reported first. */
export function validateAvroDatum(schema: unknown, datum: unknown): DatumCheck {
  const { errors: schemaErrors, registry } = checkAvroSchema(schema);
  if (schemaErrors.length) return { valid: false, errors: schemaErrors.map((e) => `Schema: ${e}`), warnings: [] };
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = schema as any;
  if (s && typeof s === 'object' && !Array.isArray(s) && (s.type === 'record' || s.type === 'error')) {
    checkRecord(s, datum, '$', s.namespace, registry, errors, warnings);
  } else {
    checkDatum(s, datum, '$', undefined, registry, errors);
  }
  return { valid: errors.length === 0, errors, warnings };
}

function sanitizeName(key: string): string {
  const cleaned = key.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

function inferType(value: unknown, key: string, used: Set<string>): any {
  if (value === null || value === undefined) return ['null', 'string'];
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    // Integers past 2^53 cannot be checked as an exact long, so they are typed double.
    return Number.isSafeInteger(value) ? 'long' : 'double';
  }
  if (Array.isArray(value)) {
    const first = value.find((v) => v !== null && v !== undefined);
    return { type: 'array', items: first === undefined ? 'string' : inferType(first, `${key}Item`, used) };
  }
  if (typeof value === 'object') return inferRecord(value as Record<string, unknown>, `${key}Record`, used);
  return 'string';
}

function inferRecord(obj: Record<string, unknown>, baseName: string, used: Set<string>, namespace?: string): any {
  let name = sanitizeName(baseName);
  for (let i = 2; used.has(name); i++) name = `${sanitizeName(baseName)}${i}`;
  used.add(name);
  const fieldNames = new Set<string>();
  const fields = Object.entries(obj).map(([key, value]) => {
    const type = inferType(value, key, used);
    // "a-b" and "a_b" both sanitize to "a_b"; field names must be unique in a record.
    let fieldName = sanitizeName(key);
    for (let i = 2; fieldNames.has(fieldName); i++) fieldName = `${sanitizeName(key)}_${i}`;
    fieldNames.add(fieldName);
    const field: any = { name: fieldName, type };
    if (Array.isArray(type) && type[0] === 'null') field.default = null;
    return field;
  });
  return namespace ? { type: 'record', name, namespace, fields } : { type: 'record', name, fields };
}

/** Infers a record schema from a JSON object (or the first object of an array). */
export function inferAvroSchema(json: unknown): any | null {
  const sample = Array.isArray(json) ? json[0] : json;
  if (!sample || typeof sample !== 'object' || Array.isArray(sample)) return null;
  return inferRecord(sample as Record<string, unknown>, 'InferredRecord', new Set(), 'com.inferred');
}

/**
 * Builds a sample datum that passes validateAvroDatum for the given schema.
 * Nullable unions get their first non-null branch so the sample shows real values.
 */
export function generateAvroSample(schema: unknown, rng: () => number = Math.random): unknown {
  const { registry } = checkAvroSchema(schema);
  const stack = new Set<string>();
  return gen(schema, 'value', (schema as any)?.namespace);

  function gen(s: any, name: string, ns: string | undefined): unknown {
    if (Array.isArray(s)) {
      const branch = s.find((b) => b !== 'null') ?? 'null';
      return gen(branch, name, ns);
    }
    if (s && typeof s === 'object') {
      const t = s.type;
      if (t === 'record' || t === 'error') {
        const key = fullName(s.name ?? '', s.namespace ?? ns);
        if (stack.has(key)) return null; // recursive type: stop
        stack.add(key);
        const out: Record<string, unknown> = {};
        const inner = innerNamespace(s, ns);
        for (const f of s.fields ?? []) {
          out[f.name] = f.default !== undefined && !Array.isArray(f.type) ? f.default : gen(f.type, f.name, inner);
        }
        stack.delete(key);
        return out;
      }
      if (t === 'enum') return s.symbols?.[0] ?? '';
      if (t === 'fixed') return '\u0000'.repeat(s.size ?? 0);
      if (t === 'array') return [gen(s.items, name, ns)];
      if (t === 'map') return { key: gen(s.values, name, ns) };
      return gen(t, name, ns);
    }
    switch (s) {
      case 'null': return null;
      case 'boolean': return rng() > 0.5;
      case 'int':
      case 'long': return Math.floor(rng() * 1000);
      case 'float':
      case 'double': return Math.round(rng() * 10000) / 100;
      case 'bytes': return '\u0000\u0001';
      case 'string':
        return name === 'email' ? 'user@example.com' : name === 'username' ? 'sampleuser' : `sample_${name}`;
      default: {
        const named = typeof s === 'string' ? resolveRef(s, ns, registry) : undefined;
        return named ? gen(named.schema, name, ns) : null;
      }
    }
  }
}
