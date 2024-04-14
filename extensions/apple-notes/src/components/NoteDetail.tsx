import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { NodeHtmlMarkdown } from "node-html-markdown";

import { getNoteBody } from "../api";
import { NoteItem, useNotes } from "../useNotes";

import NoteActions from "./NoteActions";

type NoteDetailProps = {
  note: NoteItem;
  isDeleted?: boolean;
  mutate: ReturnType<typeof useNotes>["mutate"];
};

export default function NoteDetail({ note, isDeleted, mutate }: NoteDetailProps) {
  const { data, isLoading } = useCachedPromise(
    async (id) => {
      const content = await getNoteBody(id);
      const nodeToMarkdown = new NodeHtmlMarkdown({ keepDataImages: true });
      return nodeToMarkdown.translate(content);
    },
    [note.id],
  );

  return (
    <Detail
      markdown={data}
      isLoading={isLoading}
      actions={<NoteActions note={note} isDeleted={isDeleted} mutate={mutate} isDetail />}
    />
  );
}
