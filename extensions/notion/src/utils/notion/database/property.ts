import type { DatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import type { WritablePropertyTypes } from "..";

export type DatabaseProperty = DatabaseObjectResponse["properties"][string];
export type WritableDatabaseProperty = Extract<DatabaseProperty, { type: WritablePropertyTypes }>;

type ObjectValues<T> = T[keyof T];
export type PropertyConfig<T extends WritablePropertyTypes = WritablePropertyTypes> = {
  [T in WritableDatabaseProperty as T["type"]]: ObjectValues<Omit<T, keyof WritableDatabaseProperty>>;
}[T];
export function getPropertyConfig<T extends WritablePropertyTypes>(
  property: DatabaseProperty,
  types: T[],
): PropertyConfig<T> | undefined {
  for (const type of types)
    if (property.type == type && type in property)
      // @ts-expect-error - Unable to a way to make union types and dynamic keys get along.
      return property[type];
}
