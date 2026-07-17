import { startCaffeinate } from "../utils";

/**
 * Prevents your PC from going to sleep indefinitely until manually disabled
 */
export default async function () {
  await startCaffeinate({ status: true }, undefined);

  return "PC will stay awake until you manually disable it";
}
