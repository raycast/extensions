import { Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { NoteItem } from "../useNotes";
import { getNoteById } from "../api";

export default function NoteDetail({ note }: { note: NoteItem }) {
  const { data, isLoading } = useCachedPromise(
    async (id) => {
      const content = await getNoteById(id);
      const nodeToMarkdown = new NodeHtmlMarkdown();
      return nodeToMarkdown.translate(content);
    },
    [note.id],
  );

  return <Detail markdown={data} isLoading={isLoading} />;
}
