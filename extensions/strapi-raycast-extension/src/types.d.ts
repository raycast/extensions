type FieldType =
  | "string"
  | "component"
  | "integer"
  | "boolean"
  | "date"
  | "enumeration"
  | "relation"
  | "media"
  | "richtext"
  | "password"
  | "email"
  | "dynamiczone";

type StandardField = {
  type: FieldType;
  name: string;
  min?: number;
  max?: number;
  required?: boolean;
  default?: string | number | boolean;
  enum?: string[];
  component?: string;
  target?: string;
  relation?: string;
};

type RelationField = {
  component: string;
  target: string;
  relation: string;
};

export type Field = StandardField & RelationField;

export interface ContentType {
  uid: string;
  plugin?: string;
  route: string;
  schema: {
    displayName: string;
    pluralName: string;
    kind: "collectionType" | "singleType";
    description: string;
    visible: boolean;
    attributes: {
      [key: string]: StandardField | RelationField;
    };
  };
}

export interface ContentTypeResponse {
  data: ContentType;
  error: Error;
}

export interface ContentTypesResponse {
  data: ContentType[];
  error: Error;
}

export interface Role {
  documentId: string;
  id: number;
  [key: string]: string | number | boolean | object | Date;
}

export interface Entry {
  documentId: string;
  id: number;
  [key: string]: string | number | boolean | object | Date;
}

export interface EntryResponse {
  data: Entry[];
  roles: Role[]; // User & Permissions exception
}

export interface Component {
  uid: string;
  schema: {
    displayName: string;
    description: string;
    attributes: {
      [key: string]: StandardField | RelationField;
    };
  };
}

export interface ComponentResponse {
  data: Component;
  error: Error;
}

export interface StrapiFile {
  id: string;
  name: string;
  alternativeText: string;
  caption: string;
  width: number;
  height: number;
  ext: string;
  mime: string;
  size: number;
  url: string;
}
