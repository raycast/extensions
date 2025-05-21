import { ActionPanel, Detail, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import api from "../lib/api";
import NoteActions from "./NoteActions";
import { PermissionTitleMap } from "../lib/constants";
import { getNoteUrl } from "../helpers/noteHelper";

export default function NoteDetail({ noteId, mutate }: { noteId: string; mutate?: () => void }) {
  const { data, isLoading, mutate: mutateSingle } = useCachedPromise((noteId) => api.getNote(noteId), [noteId]);
  const { pop } = useNavigation();

  const noteUrl = useMemo(() => (data && getNoteUrl(data)) || "", [data]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={data?.content}
      actions={
        <ActionPanel>
          {data && (
            <NoteActions
              note={data}
              onDeleteCallback={async () => {
                if (mutate) mutate();
                pop();
              }}
              mutate={() => {
                if (mutate) mutate();
                mutateSingle();
              }}
            />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {data?.tags?.length && data?.tags?.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {data?.tags.map((tag) => <Detail.Metadata.TagList.Item text={tag} key={tag} />)}
            </Detail.Metadata.TagList>
          ) : null}

          {data && (
            <>
              <Detail.Metadata.Label title="ID" text={data.id} />

              <Detail.Metadata.Link title="Note URL" target={noteUrl} text="Click to Open" />

              <Detail.Metadata.Label title="Title" text={data.title} />

              <Detail.Metadata.Separator />

              <Detail.Metadata.TagList title="Read Permission">
                <Detail.Metadata.TagList.Item text={PermissionTitleMap[data.readPermission]} />
              </Detail.Metadata.TagList>

              <Detail.Metadata.TagList title="Write Permission">
                <Detail.Metadata.TagList.Item text={PermissionTitleMap[data.writePermission]} />
              </Detail.Metadata.TagList>

              <Detail.Metadata.Label title="Last Changed At" text={new Date(data?.lastChangedAt).toLocaleString()} />
              <Detail.Metadata.Label title="Created" text={new Date(data?.createdAt).toLocaleString()} />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
