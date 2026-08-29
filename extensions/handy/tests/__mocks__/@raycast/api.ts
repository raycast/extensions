export const trash = async (_path: string): Promise<void> => {};

export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
    Animated: "ANIMATED",
  },
} as const;
