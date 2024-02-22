import { stop } from "./api/stop";
import { getErrorMessage } from "./utils/getError";

export default async function Command() {
  try {
    await stop();
  } catch (err) {
    const error = getErrorMessage(err);
    console.log("Error when playing station 1 stream:", error);
  }
}
