import { asString, run } from "../exec";
import { translator } from "../messages";
import { terminalNotifierPath } from "../install";
import { Config } from "../types";
import { NotificationChannel, NotificationMessage } from "./types";

/** Navigation belongs to this presentation channel, never to the state reducer or collector. */
export function raycastNotificationLink(config: Config, message: Pick<NotificationMessage, "agent" | "sessionId">): string {
  const context = encodeURIComponent(JSON.stringify({ jump: { agent: message.agent, sessionId: message.sessionId } }));
  return `${config.deeplinkBase}/inbox?context=${context}`;
}

export function macosChannel(link = raycastNotificationLink): NotificationChannel {
  return {
    id: "macos",
    async send(message, { config }) {
      const t = translator();
      const title = t(message.attention && message.attention !== "input" ? `attention.${message.attention}` : "notify.waiting");
      const notifier = terminalNotifierPath();
      const result = notifier
        ? await run(
            notifier,
            [
              "-title",
              title,
              "-subtitle",
              message.title,
              "-message",
              message.summary || " ",
              "-sound",
              "default",
              "-group",
              `${message.agent}:${message.sessionId}`,
              "-open",
              link(config, message),
            ],
            undefined,
            8000,
          )
        : await run(
            "/usr/bin/osascript",
            [
              "-e",
              `display notification ${asString(message.summary || " ")} with title ${asString(title)} subtitle ${asString(message.title)} sound name "Glass"`,
            ],
            undefined,
            8000,
          );
      if (!result.ok) throw new Error(result.stderr || "macOS notification failed");
    },
  };
}
