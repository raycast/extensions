import { Action, Icon, open } from "@raycast/api";
import { PEXELS_URL } from "../utils/costants";

export function ActionToPexels() {
  return (
    <Action
      icon={Icon.Globe}
      title={"Go to Pexels"}
      shortcut={{ modifiers: ["shift", "cmd"], key: "o" }}
      onAction={async () => {
        await open(PEXELS_URL);
      }}
    />
  );
}
