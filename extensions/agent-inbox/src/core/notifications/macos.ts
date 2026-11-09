import { attentionLabel } from "../format";
import { run } from "../exec";
import { terminalNotifierPath } from "../install";
import { Config } from "../types";
import { NotificationChannel, NotificationMessage } from "./types";

/** Navigation belongs to this presentation channel, never to the state reducer or collector. */
export function raycastNotificationLink(
  config: Config,
  message: Pick<NotificationMessage, "agent" | "sessionId">,
): string {
  const context = encodeURIComponent(JSON.stringify({ jump: { agent: message.agent, sessionId: message.sessionId } }));
  return `${config.deeplinkBase}/inbox?context=${context}`;
}

export function macosChannel(
  link = raycastNotificationLink,
  actions = { run, terminalNotifierPath },
): NotificationChannel {
  return {
    id: "macos",
    async send(message, { config }) {
      const title =
        message.attention && message.attention !== "input" ? attentionLabel(message.attention) : "Waiting for you";
      const notifier = actions.terminalNotifierPath();
      const result = notifier
        ? await actions.run(
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
        : await actions.run(
            "/usr/bin/osascript",
            [
              "-e",
              `on run argv
  display notification (item 1 of argv) with title (item 2 of argv) subtitle (item 3 of argv) sound name "Glass"
end run`,
              "--",
              message.summary || " ",
              title,
              message.title,
            ],
            undefined,
            8000,
          );
      if (!result.ok) throw new Error(result.stderr || "macOS notification failed");
    },
  };
}
