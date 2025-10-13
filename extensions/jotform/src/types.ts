export type Form = {
  id: string;
  username: string;
  title: string;
  height: string;
  status: "ENABLED" | "DISABLED" | "DELETED";
  created_at: string;
  updated_at: string;
  last_submission: string | null;
  new: string;
  count: string;
  type: "LEGACY" | "CARD";
  favorite: "0" | "1";
  archived: "0" | "1";
  url: string;
};
export type FormSubmission = {
  id: string;
  form_id: string;
  ip: string;
  created_at: string;
  updated_at: string;
  status: "ACTIVE" | "OVERQUOTA";
  new: "0" | "1";
  answers: {
    [answer: string]: {
      text: string;
      type: string;
    } & (
      | {
          answer: Record<string, string>;
          prettyFormat?: string;
        }
      | {
          answer: string;
        }
    );
  };
  workflowStatus: string;
};

export type ErrorResponse = {
  responseCode: number;
  message: Exclude<string, "success">;
  content: string;
  duration: string;
  info: string;
};

export type SuccessResponse<T> = {
  responseCode: number;
  message: "success";
  content: T;
  duration: string;
  info: null;
  resultSet: {
    offset: number;
    limit: number;
    count: number;
  };
  "limit-left": number;
};
