import { Detail, Action, ActionPanel } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export const NoteDetail = ({ content }: { content: string }) => {
  const [{ path }] = useCachedState("path", { cached: false, path: "/Applications/Joplin.app" });

  return (
    <Detail
      markdown={content}
      actions={
        <ActionPanel>
          <Action.Open title="Open Note" target={path} />
        </ActionPanel>
      }
    />
  );
};
