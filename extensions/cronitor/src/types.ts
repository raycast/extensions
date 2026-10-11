export type ErrorResult =
  | {
      detail: string;
    }
  | {
      error: {
        message: string;
        type: string;
      };
    };
export type Monitor = {
  created: string;
  disabled: boolean;
  key: string;
  name: string;
  type: "job" | "heartbeat" | "check" | "site";
  badges: {
    simple: string;
    detailed: string;
  };
};
