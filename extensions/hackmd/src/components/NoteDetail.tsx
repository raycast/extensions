import { ActionPanel, Detail, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import api from "../lib/api";
import NoteActions from "./NoteActions";

export default function NoteDetail({ noteId, mutate }: { noteId: string; mutate?: () => void }) {
  const { data, isLoading } = useCachedPromise((noteId) => api.getNote(noteId), [noteId]);
  const { pop } = useNavigation();

  return (
    <Detail
      isLoading={isLoading}
      markdown={data?.content}
      actions={
        <ActionPanel>
          <NoteActions note={data} onDeleteCallback={() => pop()} mutate={mutate} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {data?.tags?.length && data?.tags?.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {data?.tags.map((tag) => (
                <Detail.Metadata.TagList.Item text={tag} key={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}

          {data && (
            <>
              <Detail.Metadata.Label title="ID" text={data.id} />

              {/* TODO: URL */}

              <Detail.Metadata.Label title="Title" text={data.title} />

              <Detail.Metadata.Separator />

              {/* TODO: display permission in TagList */}
              <Detail.Metadata.Label title="Read Permission" text={data.readPermission} />
              <Detail.Metadata.Label title="Write Permission" text={data.writePermission} />

              <Detail.Metadata.Label title="Created" text={new Date(data?.createdAt).toLocaleString()} />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
