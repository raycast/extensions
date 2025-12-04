import { getApplications } from "@raycast/api";
import { openChat } from "../services/openChat";

type Input = {
  /**
   * The name of the person to open a chat with
   */
  name: string;
  /**
   * The message to send
   */
  message?: string;
  /**
   * Open in web or app ("web" or "app")
   * @default "app"
   */
  openIn?: "web" | "app";
};

/**
 * Opens a WhatsApp chat in either the app or web.
 */
export default async function (input: Input) {
  const installedApps = await getApplications();
  const openIn =
    input.openIn ??
    (installedApps.some((app) => app.name.includes("WhatsApp") && app.bundleId?.includes("net.whatsapp.WhatsApp"))
      ? "app"
      : "web");
  await openChat({ chatName: input.name, message: input.message, openIn });
}
