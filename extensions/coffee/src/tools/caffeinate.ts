import { startCaffeinate, caffeinationReply } from "../utils";

/**
 * Prevents your computer from going to sleep indefinitely until manually disabled
 */
export default async function () {
  const prevention = await startCaffeinate({ menubar: true, status: true }, undefined, "");

  return caffeinationReply("until you manually disable it", prevention);
}
