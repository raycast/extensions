import { Action, environment } from "@raycast/api";

function createDeeplink(view: string) {
  const protocol = environment.raycastVersion.includes("alpha") ? "raycastinternal://" : "raycast://";
  const context = encodeURIComponent(JSON.stringify({ view }));
  return `${protocol}extensions/thomaslombart/todoist/home?launchContext=${context}`;
}

type CreateViewActionProps = {
  title: string;
  view: string;
};

export default function CreateViewAction({ title, view }: CreateViewActionProps) {
  return (
    <Action.CreateQuicklink
      title="Create View Quicklink"
      quicklink={{
        link: createDeeplink(view),
        name: title,
      }}
    />
  );
}
