export type FalModel = {
  endpoint_id: string;
  metadata?: {
    display_name?: string;
    category?: string;
    description?: string;
    status?: string;
    tags?: string[];
    thumbnail_url?: string;
    model_url?: string;
    updated_at?: string;
  };
  openapi?: OpenApiDocument;
};

export type FalModelsResponse = {
  models: FalModel[];
  next_cursor?: string | null;
  has_more: boolean;
};

export type OpenApiDocument = {
  openapi?: string;
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: {
    schemas?: Record<string, JsonSchema>;
  };
};

export type OpenApiOperation = {
  requestBody?: {
    content?: Record<string, { schema?: JsonSchema }>;
  };
};

export type JsonSchema = {
  $ref?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  format?: string;
  minimum?: number;
  maximum?: number;
};

export type SchemaField = {
  name: string;
  title: string;
  description?: string;
  required: boolean;
  schema: JsonSchema;
  kind: "string" | "number" | "boolean" | "enum" | "json";
  enumOptions?: Array<{ title: string; value: string; rawValue: unknown }>;
  defaultValue?: unknown;
};

export type QueueStatus =
  | "IN_QUEUE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "UNKNOWN";

export type QueueSubmitResponse = {
  request_id: string;
  response_url?: string;
  status_url?: string;
  cancel_url?: string;
  queue_position?: number;
};

export type QueueStatusResponse = {
  status: QueueStatus;
  request_id?: string;
  response_url?: string;
  logs?: Array<{ message?: string; timestamp?: string; level?: string }>;
  metrics?: { inference_time?: number | null };
  queue_position?: number;
  error?: string;
  error_type?: string;
};

export type GenerationRecord = {
  id: string;
  endpointId: string;
  title: string;
  prompt?: string;
  input: Record<string, unknown>;
  status: QueueStatus;
  queuePosition?: number;
  responseUrl?: string;
  statusUrl?: string;
  cancelUrl?: string;
  result?: unknown;
  mediaUrls: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type FalAsset = {
  vector_id?: string;
  request_id?: string;
  url?: string;
  type?: string;
  title?: string;
  endpoint?: string;
  created_at?: string;
  prompt?: string;
  width?: number;
  height?: number;
  content_type?: string;
};
