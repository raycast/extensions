import { Action } from "@raycast/api";
import { ComponentProps } from "react";

export function ActionOpenInBrowser(
  props: Omit<ComponentProps<typeof Action.OpenInBrowser>, "shortcut">,
) {
  return (
    <Action.OpenInBrowser
      shortcut={{
        key: "o",
        modifiers: ["cmd"],
      }}
      {...props}
    />
  );
}
