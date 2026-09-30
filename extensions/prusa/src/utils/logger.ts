const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug("[Prusa]", ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error("[Prusa]", ...args);
    }
  },
};
