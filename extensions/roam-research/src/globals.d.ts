type BlockParentPull = {
  ":block/uid": string;
  ":block/string"?: string;
  ":node/title"?: string;
  ":block/_children"?: BlockParentPull[];
};

// query used for this most of the time is `./roamApi/BLOCK_QUERY`
type ReversePullBlock = {
  ":block/uid": string;
  ":block/string"?: string;
  ":node/title"?: string;
  ":edit/time"?: number;
  ":create/time"?: number;
  ":block/_children"?: BlockParentPull[];
  ":block/_refs"?: { ":db/id": number }[];
  ":block/refs"?: { ":block/uid": string; ":block/string"?: string; ":node/title"?: string }[];
  [key: string]: unknown;
};

type CaptureTemplate = {
  id: string;
  name: string;
  graphName?: string;
  page?: string;
  nestUnder?: string;
  tags?: string[];
  contentTemplate: string;
};

type GraphConfig = {
  nameField: string;
  tokenField: string;
  capabilities?: { read: boolean; append: boolean; edit: boolean };
};

type TemplatesConfig = {
  templates: CaptureTemplate[];
  legacyTemplateConsumed?: boolean;
  instantCaptureTemplateId?: string;
};

type GraphsConfigMap = Record<string, GraphConfig>;

type OutboxItemStatus = "pending" | "synced" | "failed";

type OutboxItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: OutboxItemStatus;
  graphName: string;
  content: string;
  processedContent: string;
  pageTitle: string | { "daily-note-page": string };
  nestUnder?: string;
  tags?: string[];
  templateName?: string;
  errorMessage?: string;
  isRetryable?: boolean;
  retryCount: number;
};
