import BeeperDesktop from "@beeper/desktop-api";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

export const parseDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const getMessageID = (message: BeeperDesktop.Message & { messageID?: string }) =>
  message.messageID ?? message.id;

export const getBeeperAppPath = () => {
  const candidates =
    platform() === "win32"
      ? [
          join(process.env.LOCALAPPDATA || "", "Programs", "Beeper", "Beeper.exe"),
          join(homedir(), "AppData", "Local", "Programs", "Beeper", "Beeper.exe"),
        ]
      : ["/Applications/Beeper Desktop.app", join(homedir(), "Applications", "Beeper Desktop.app")];
  return candidates.find((path) => existsSync(path));
};

export const getSenderDisplayName = (msg: BeeperDesktop.Message) => {
  if (msg.isSender) return "You";
  return msg.senderName || msg.senderID?.split(":")[0]?.replace("@", "") || "Unknown";
};
