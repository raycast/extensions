const isDebugMode = process.env.NODE_ENV === "development";

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDebugMode) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
