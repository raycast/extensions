import { showFailureToast } from "@raycast/utils";
import { WebflowError } from "webflow-api";

export async function onError(error: Error | WebflowError) {
  let title = "Something went wrong";
  let message = error.message;
  if ("body" in error) {
    const body = error.body as { message: string; code: string };
    title = body.code;
    message = body.message;
  }
  await showFailureToast(message, { title });
}
