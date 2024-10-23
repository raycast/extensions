import type { DatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import type { ReadablePropertyType } from "..";
import type { Standardized } from "../standardize";

type NotionDatabaseProperty = Extract<DatabaseObjectResponse["properties"][string], { type: ReadablePropertyType }>;
export type DatabaseProperty = Standardized<NotionDatabaseProperty, "config">;

// TODO: Replace all uses of this type and function
export type PropertyConfig<T extends ReadablePropertyType> = Extract<DatabaseProperty, { type: T }>["config"];
