export type BlockType =
  | "contact"
  | "input"
  | "textarea"
  | "phone"
  | "text"
  | "number"
  | "url"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "date"
  | "address"
  | "scheduler"
  | "star_rating"
  | "opinion_scale"
  | "ranking"
  | "signature"
  | "file_upload"
  | "payment"
  | "matrix"
  | "nps";
type BaseBlock = {
  id: string;
  position: number;
  type: BlockType;
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
  closed: null;
  submissions_count: number | null;
  published_at: string | null;
  close_by_date: string | null;
  close_by_submissions: number | null;
  deleted_at: string | null;
};
export type Submission = {
  id: number;
  data: {
    [id: string]: string | number | null;
  };
  created_at: string;
};
type Result<T> = {
  data: T;
};
export type PaginatedResult<T> = Result<{ data: T[] }>;
