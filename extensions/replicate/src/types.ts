export type PredictionResponse = {
  next: string | null;
  previous: string | null;
  results: Prediction[];
  detail?: string;
};

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export type Prediction = {
  id: string;
  model?: string;
  version?: string;
  urls?: {
    get?: string;
    cancel?: string;
    stream?: string;
  };
  input?: { prompt?: string } & Record<string, unknown>;
  status: PredictionStatus;
  output?: unknown;
  error?: string | null;
  logs?: string | null;
  created_at?: string;
  completed_at?: string;
  metrics?: {
    predict_time?: number;
  };
};

export type OptionSchema = {
  type?: string;
  format?: string;
  title?: string;
  default?: string | number | boolean;
  description?: string;
  enum?: string[];
  items?: OptionSchema;
  allOf?: { $ref: string }[];
  minimum?: number;
  maximum?: number;
  "x-order"?: number;
};

export type InputSchema = OptionSchema & {
  properties?: Record<string, OptionSchema>;
  required?: string[];
};

export type OpenApiSchema = {
  components: {
    schemas: Record<string, InputSchema>;
  };
};

export type ModelVersion = {
  id: string;
  openapi_schema: OpenApiSchema;
};

export type Model = {
  owner: string;
  name: string;
  description?: string;
  cover_image_url?: string | null;
  run_count?: number;
  is_official?: boolean;
  github_url?: string | null;
  paper_url?: string | null;
  license_url?: string | null;
  default_example?: Prediction | null;
  latest_version?: ModelVersion | null;
};

export type SearchResponse = {
  models?: { model: Model; metadata?: { tags?: string[] } }[];
};

export type ReplicateFile = {
  id: string;
  urls?: { get?: string };
};

export type Collection = {
  name: string;
  slug: string;
  description?: string;
};

export type CollectionsResponse = {
  results: Collection[];
  next: string | null;
};

export type CollectionResponse = Collection & {
  models?: Model[];
};
