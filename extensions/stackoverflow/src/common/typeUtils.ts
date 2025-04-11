/* eslint-disable @typescript-eslint/no-explicit-any */
export function assertNumberProp<Prop extends string>(item: unknown, prop: Prop): asserts item is Record<Prop, number> {
  if (!item || typeof (item as any)[prop] !== "number") {
    throw new Error(`no ${prop} found`);
  }
}

export function assertStringProp<Prop extends string>(item: unknown, prop: Prop): asserts item is Record<Prop, string> {
  if (!item || typeof (item as any)[prop] !== "string") {
    throw new Error(`no ${prop} found`);
  }
}

export function hasStringProp<Prop extends string>(item: unknown, prop: Prop): item is Record<Prop, string> {
  return !!item && typeof (item as any)[prop] === "string";
}

export function hasObjectProp<Prop extends string>(item: unknown, prop: Prop): item is Record<Prop, object> {
  return !!item && typeof (item as any)[prop] === "object";
}

export function assertObjectProp<Prop extends string>(item: unknown, prop: Prop): asserts item is Record<Prop, object> {
  if (!item || typeof (item as any)[prop] !== "object") {
    throw new Error(`no ${prop} found`);
  }
}

export function assertArrayProp<Prop extends string>(
  item: unknown,
  prop: Prop,
): asserts item is Record<Prop, unknown[]> {
  if (!item || !Array.isArray((item as any)[prop])) {
    throw new Error(`no ${prop} found`);
  }
}
