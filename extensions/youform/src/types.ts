type BaseBlock = {
  id: string;
  position: number;
  type: string;
};
export type Block = BaseBlock & {
  [key: string]: string | number | null;
};

export type Form = {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  workspace_id: number;
  updated_at: string;
  slug: string;
  fields: {
    blocks: Block[];
  } | null;
  draft_fields: {
    blocks: Block[];
  } | null;
  design: {
    font: string;
    corner: string;
    "text-color": string;
    "rating-color": string;
    "background-color": string;
    "button-text-color": string;
    "background-image-url": string;
    "button-background-color": string;
  };
  submissions_count: number | null;
};
export type Submission = {
  id: number;
  uid: string;
  form_id: number;
};
type Result<T> = {
  data: T;
};
export type PaginatedResult<T> = Result<{ data: T[] }>;
