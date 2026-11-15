export type ContentKind = "collectionType" | "singleType";

export type FieldType =
  | "string"
  | "text"
  | "richtext"
  | "blocks"
  | "email"
  | "password"
  | "uid"
  | "integer"
  | "biginteger"
  | "float"
  | "decimal"
  | "boolean"
  | "date"
  | "time"
  | "datetime"
  | "timestamp"
  | "enumeration"
  | "json"
  | "media"
  | "relation"
  | "component"
  | "dynamiczone";

export interface Attribute {
  type: FieldType;
  required?: boolean;
  private?: boolean;
  [key: string]: unknown;
}

export interface ContentType {
  uid: string;
  plugin?: string;
  route: string;
  schema: {
    displayName: string;
    singularName: string;
    pluralName: string;
    kind: ContentKind;
    description?: string;
    visible: boolean;
    draftAndPublish?: boolean;
    pluginOptions?: {
      i18n?: { localized?: boolean };
    };
    attributes: Record<string, Attribute>;
  };
}

export interface ContentTypesResponse {
  data: Omit<ContentType, "route">[];
}

export interface Entry {
  id: number;
  documentId: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  locale?: string | null;
  [key: string]: unknown;
}

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

/**
 * Content API responses come in different shapes:
 * - `{ data, meta }` for regular content-types
 * - `{ roles }` for Users & Permissions roles
 * - a plain array for Users & Permissions users
 */
export type EntriesResponse = { data: Entry[]; meta?: { pagination?: Pagination } } | { roles: Entry[] } | Entry[];

export interface Locale {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
}

export interface StrapiFile {
  id: number;
  documentId?: string;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  ext: string;
  mime: string;
  size: number;
  url: string;
  createdAt?: string;
}
