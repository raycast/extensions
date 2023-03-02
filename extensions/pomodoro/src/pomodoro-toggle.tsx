import { Cache, launchCommand, LaunchType } from "@raycast/api";

export default async () => {
  const cache = new Cache();
  cache.set("pomodoro_on", cache.get("pomodoro_on") === "true" ? "false" : "true");

  launchCommand({
    name: "pomodoro-menu-bar",
    type: LaunchType.UserInitiated,
  });
};
