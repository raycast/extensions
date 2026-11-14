import { Keyboard, Action, Icon, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef } from "react";
import { consoleUrl } from "../lib/console";

export function ConsoleAction({ title = "Open in Executor", path }: { title?: string; path: string }) {
  const opening = useRef(false);
  return (
    <Action
      title={title}
      shortcut={Keyboard.Shortcut.Common.Open}
      icon={Icon.Globe}
      onAction={async () => {
        if (opening.current) return;
        opening.current = true;
        try {
          await open(await consoleUrl(path));
        } catch (error) {
          await showFailureToast(error, { title: "Could Not Open Executor" });
        } finally {
          opening.current = false;
        }
      }}
    />
  );
}
