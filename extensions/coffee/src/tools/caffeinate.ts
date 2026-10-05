import { startCaffeinate, deviceName } from "../utils";

/**
 * Prevents your computer from going to sleep indefinitely until manually disabled
 */
export default async function () {
  await startCaffeinate({ menubar: true, status: true }, undefined, "");

  return `${deviceName()} will stay awake until you manually disable it`;
}
