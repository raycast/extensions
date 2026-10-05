import { showFailureToast } from "@raycast/utils";
import { isPayNowError } from "@paynow-gg/typescript-sdk";
import z, { ZodError } from "zod";

export const showPaynowError = async (error: unknown) => {
  if (isPayNowError(error)) {
    return await showFailureToast(error.message, {
      title: `PayNow Error ${error.status}`,
      message: error.message,
    });
  }
  if (error instanceof ZodError) {
    return await showFailureToast("Validation Error", {
      title: "Validation Error",
      message: z.prettifyError(error),
    });
  }

  console.error(error);
  if (error instanceof Error) {
    return await showFailureToast(error, {
      title: "Error",
      message: error.message,
    });
  }
  return await showFailureToast("An unknown error occurred");
};
