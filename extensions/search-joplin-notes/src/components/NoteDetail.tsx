import { Detail, Action, ActionPanel } from "@raycast/api";
import { useNoteDetailFetch } from "./../utils/hooks";

type Props = { id: string };

export const NoteDetail = (props: Props) => {
  const { id } = props;
  const { isLoading, data } = useNoteDetailFetch(id);
  const url = `joplin://x-callback-url/openNote?id=${id}`;

  return (
    <Detail
      markdown={data?.body}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} title="Open Note" />
        </ActionPanel>
      }
    />
  );
};
