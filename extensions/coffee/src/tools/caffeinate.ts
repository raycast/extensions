import { startCaffeinate } from "../utils";

/**
 * Prevents your Mac from going to sleep indefinitely until manually disabled
 */
export default async function () {
  await startCaffeinate({ menubar: true, status: true }, undefined, "");

  return "Mac will stay awake until you manually disable it";
}
