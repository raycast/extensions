import { captureException } from "@raycast/api";

// Rethrows so usePromise still shows its failure toast with Retry.
export const reportErrors =
  <Args extends unknown[], Result>(load: (...args: Args) => Promise<Result>) =>
  async (...args: Args) => {
    try {
      return await load(...args);
    } catch (error) {
      captureException(error);
      throw error;
    }
  };
