export type Paste = {
  duration: number | null;
  id: string;
  language: string;
  title: string;
  url: string;
};
export type ErrorResult = {
  result: "error";
  error_msg: string;
};
export type ActionResult =
  | {
      result: "success";
    }
  | ErrorResult;
