import type { DatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import type { WritablePropertyTypes } from "..";

type AllDatabaseProperty = DatabaseObjectResponse["properties"][string];
export type DatabaseProperty = Extract<AllDatabaseProperty, { type: WritablePropertyTypes }>;

type ObjectValues<T> = T[keyof T];
export type PropertyConfig<T extends WritablePropertyTypes = WritablePropertyTypes> = {
  [T in DatabaseProperty as T["type"]]: ObjectValues<Omit<T, keyof DatabaseProperty>>;
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
