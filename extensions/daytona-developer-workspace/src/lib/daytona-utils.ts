import { Daytona } from "@daytonaio/sdk";
import { getDaytonaClient } from "./daytona-client";
import { toastUtils } from "./toast-utils";

export const daytonaUtils = {
  withClient: async <T>(operation: (client: Daytona) => Promise<T>): Promise<T> => {
    const client = getDaytonaClient();
    return await operation(client);
  },

  executeWithToast: async <T>(
    operation: () => Promise<T>,
    loadingMessage: string,
    successMessage: string,
  ): Promise<T> => {
    await toastUtils.loading("Processing", loadingMessage);
    try {
      const result = await operation();
      await toastUtils.success("Success", successMessage);
      return result;
    } catch (error) {
      await toastUtils.apiError(error);
      throw error;
    }
  },

  formatDate: (date: string | Date): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  },

  normalizeDate: (date: string | Date): string => {
    return typeof date === "string" ? date : date.toISOString();
  },
};
