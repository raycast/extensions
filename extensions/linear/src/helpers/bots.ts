import { ActorBot } from "@linear/sdk";
import { Icon, Image } from "@raycast/api";

export function getBotIcon(bot?: Pick<ActorBot, "name"> | null) {
  if (bot) {
    return {
      source:
        bot.name === "GitHub" ? "bots/github.svg" : bot.name === "GitLab" ? "bots/gitlab.svg" : "linear-app-icon.png",
      mask: Image.Mask.Circle,
    };
  }

  return Icon.Person;
}
