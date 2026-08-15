import { Action, Keyboard } from "@raycast/api";

import { QuickLinkView } from "../home";
import { useIsTodoistInstalled } from "../hooks/useIsTodoistInstalled";

function createDeeplink(view: string) {
  const context = encodeURIComponent(JSON.stringify({ view }));
  return `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/thomaslombart/todoist/home?launchContext=${context}`;
}

export default function CreateViewActions({ title, view, todoistLink }: QuickLinkView) {
  const isTodoistInstalled = useIsTodoistInstalled();

  return (
    <>
      <Action.CreateQuicklink
        title="Create Raycast Quicklink"
        quicklink={{
          link: createDeeplink(view),
          name: title,
        }}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "n" },
          Windows: { modifiers: ["ctrl", "shift"], key: "n" },
        }}
      />

      {todoistLink ? (
        <Action.CreateQuicklink
          title="Create Todoist Quicklink"
          icon="todoist.png"
          quicklink={{
            link: isTodoistInstalled ? todoistLink.app : todoistLink.web,
            name: title,
          }}
          shortcut={Keyboard.Shortcut.Common.New}
        />
      ) : null}
    </>
  );
}
