import type { DatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import type { ReadablePropertyType, WritablePropertyType } from "..";
import type { Standardized } from "../standardize";

type NotionDatabaseProperty = Extract<DatabaseObjectResponse["properties"][string], { type: ReadablePropertyType }>;
export type DatabaseProperty = Standardized<NotionDatabaseProperty, "config">;
export type WritableDatabaseProperty = Extract<DatabaseProperty, { type: WritablePropertyType }>;

// TODO: Replace all uses of this type and function
export type PropertyConfig<T extends ReadablePropertyType> = Extract<DatabaseProperty, { type: T }>["config"];
