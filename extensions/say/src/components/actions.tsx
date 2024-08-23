import { Action, open } from "@raycast/api";

export const ConfigureSpokenContent = () => (
  <Action
    icon={{ source: "spoken-content.png" }}
    title="Configure Spoken Content"
    onAction={() => {
      open("x-apple.systempreferences:com.apple.preference.universalaccess");
    }}
  ></Action>
);
