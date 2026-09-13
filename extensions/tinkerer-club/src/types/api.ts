export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type ProcedureType = "query" | "mutation";

export type SchemaType = "array" | "boolean" | "integer" | "null" | "number" | "object" | "string";

export interface JsonSchema {
  $schema?: string;
  type?: SchemaType;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: JsonPrimitive[];
  anyOf?: JsonSchema[];
  items?: JsonSchema;
  default?: JsonValue;
  const?: JsonPrimitive;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  format?: string;
  pattern?: string;
}

export interface ApiProcedure {
  description: string;
  inputSchema: JsonSchema;
  path: string;
  readOnly: boolean;
  tags: string[];
  type: ProcedureType;
}

export interface ApiCatalog {
  endpoints: {
    call: string;
    catalog: string;
    docs: string;
    mcp: string;
  };
  name: string;
  procedureCount: number;
  procedures: ApiProcedure[];
  version: string;
}

export interface SearchAllInput extends JsonObject {
  query: string;
}

export type PromptKind = "IMAGE" | "SYSTEM_PROMPT" | "TEXT" | "VIBE_COMMAND" | "VIBE_RULE" | "VIDEO";
export type PromptSort = "NEWEST" | "POPULAR" | "TRENDING";
export type PromptView = "EXPLORE" | "MINE" | "SAVED";

export interface PromptListInput extends JsonObject {
  kind?: PromptKind;
  limit: number;
  page: number;
  query?: string;
  sort: PromptSort;
  topicSlug?: string;
  view: PromptView;
}

export type PostDestination = "draft" | "now" | "queue";

export interface CreateShortPostInput extends JsonObject {
  content: string;
  images: JsonValue[];
  publish: "now" | "queue";
  topicSlugs: string[];
  type: "SHORT";
}

export interface SaveShortDraftInput extends JsonObject {
  content: string;
  images: JsonValue[];
  topicSlugs: string[];
}

export interface TimelineInput extends JsonObject {
  cursor?: string;
  limit?: number;
  supportsSparsePages: boolean;
}

export interface ListCommentsInput extends JsonObject {
  cursor?: string;
  limit?: number;
  postId: string;
}

export interface AddCommentInput extends JsonObject {
  content: string;
  images: JsonValue[];
  parentId?: string;
  postId: string;
}

export interface PostReactionInput extends JsonObject {
  postId: string;
  reaction: string;
}

export interface RemovePostReactionInput extends JsonObject {
  postId: string;
  reaction?: string;
}

export interface CommentReactionInput extends JsonObject {
  commentId: string;
  reaction: string;
}

export interface RemoveCommentReactionInput extends JsonObject {
  commentId: string;
}
