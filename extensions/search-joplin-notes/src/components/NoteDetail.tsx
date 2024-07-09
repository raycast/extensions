import { Detail, Action, ActionPanel } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useNoteDetailFetch } from "./../utils/hooks";

type Props = { id: string };

export const NoteDetail = (props: Props) => {
  const { id } = props;
  const [{ path }] = useCachedState("path", { cached: false, path: "/Applications/Joplin.app" });
  const { isLoading, data } = useNoteDetailFetch(id);

  return (
    <Detail
      markdown={data?.body}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Open title="Open Note" target={path} />
        </ActionPanel>
      }
    />
  );
};
