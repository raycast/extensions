import { Action, environment } from "@raycast/api";

import { isTodoistInstalled } from "../helpers/isTodoistInstalled";
import { QuickLinkView } from "../home";

function createDeeplink(view: string) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const context = encodeURIComponent(JSON.stringify({ view }));
  return `${protocol}extensions/thomaslombart/todoist/home?launchContext=${context}`;
}

export default function CreateViewActions({ title, view, todoistLink }: QuickLinkView) {
  return (
    <>
      <Action.CreateQuicklink
        title="Create Raycast Quicklink"
        quicklink={{
          link: createDeeplink(view),
          name: title,
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
        />
      ) : null}
    </>
  );
}
