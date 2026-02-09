export type ModelMetadata = {
  display_name: string;
  category: string;
  description: string;
  status: "active" | "deprecated";
  tags: string[];
  updated_at: string;
  thumbnail_url?: string;
  model_url?: string;
};

export type ModelEndpoint = {
  endpoint_id: string;
  metadata?: ModelMetadata;
  openapi?: Record<string, unknown>;
};

export type ModelSearchResponse = {
  models: ModelEndpoint[];
  next_cursor?: string | null;
  has_more: boolean;
};

export type OpenAPIObject = {
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
  };
};

export type InputField = {
  key: string;
  label: string;
  required: boolean;
  description?: string;
  kind: "text" | "number" | "boolean" | "enum" | "image" | "image-array";
  enumValues?: string[];
  defaultValue?: string | number | boolean;
};
