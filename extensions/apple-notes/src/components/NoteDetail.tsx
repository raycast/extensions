import { Detail, open, showToast, Toast, closeMainWindow } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatDistanceToNow } from "date-fns";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useEffect, useRef } from "react";

import { getNoteBody } from "../api/applescript";
import { stripLargeImages, truncate, isContentTooLarge, truncateContent, getOpenNoteURL } from "../helpers";
import { NoteItem, useNotes } from "../hooks/useNotes";

import NoteActions from "./NoteActions";

type NoteDetailProps = {
  note: NoteItem;
  isDeleted?: boolean;
  mutate: ReturnType<typeof useNotes>["mutate"];
};

export default function NoteDetail({ note, isDeleted, mutate }: NoteDetailProps) {
  const hasOpenedInAppleNotes = useRef(false);

  const { data, isLoading } = useCachedPromise(
    async (id) => {
      try {
        const content = await getNoteBody(id);

        // Check if content is too large before processing
        const MAX_SAFE_SIZE_MB = 10;
        if (isContentTooLarge(content, MAX_SAFE_SIZE_MB)) {
          return {
            tooLarge: true,
            sizeMB: Math.round((content.length * 2) / 1024 / 1024),
            content: null,
          };
        }

        const processedContent = stripLargeImages({ html: content, maxSizeMB: 1 });
        const nodeToMarkdown = new NodeHtmlMarkdown({ keepDataImages: true });
        const markdown = nodeToMarkdown.translate(processedContent);

        // Double check the final markdown size and truncate if needed
        const finalMarkdown = truncateContent(markdown, MAX_SAFE_SIZE_MB);

        return {
          tooLarge: false,
          content: finalMarkdown,
          sizeMB: null,
        };
      } catch (err) {
        // Clean up any allocated memory on error
        if (global.gc) {
          global.gc();
        }
        throw err;
      }
    },
    [note.id],
    {
      onError: async (err) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load note",
          message: String(err),
        });
      },
    },
  );

  // If note is too large, automatically open in Apple Notes
  useEffect(() => {
    if (data?.tooLarge && !hasOpenedInAppleNotes.current) {
      hasOpenedInAppleNotes.current = true;

      showToast({
        style: Toast.Style.Animated,
        title: "Note Too Large",
        message: `This note (${data.sizeMB}MB) is too large to display. Opening in Apple Notes...`,
      }).then(async () => {
        await open(getOpenNoteURL(note.UUID));
        await closeMainWindow();
      });
    }
  }, [data, note.UUID]);

  // Show a placeholder while opening in Apple Notes
  if (data?.tooLarge) {
    return (
      <Detail
        markdown={`# Note Too Large to Display\n\nThis note is approximately **${data.sizeMB}MB** in size, which is too large to safely display in Raycast.\n\nThe note has been opened in **Apple Notes** for you to view.\n\n---\n\n**Note:** ${note.title}`}
        metadata={
          <Detail.Metadata>
            {note.account ? <Detail.Metadata.Label title="Account" text={note.account} /> : null}
            {note.folder ? <Detail.Metadata.Label title="Folder" text={note.folder} /> : null}
            {note.modifiedAt ? (
              <Detail.Metadata.Label title="Last Update" text={formatDistanceToNow(note.modifiedAt)} />
            ) : null}
          </Detail.Metadata>
        }
        actions={<NoteActions note={note} isDeleted={isDeleted} mutate={mutate} isDetail />}
      />
    );
  }

  return (
    <Detail
      markdown={data?.content ?? ""}
      metadata={
        <Detail.Metadata>
          {note.account ? <Detail.Metadata.Label title="Account" text={note.account} /> : null}
          {note.folder ? <Detail.Metadata.Label title="Folder" text={note.folder} /> : null}
          {note.modifiedAt ? (
            <Detail.Metadata.Label title="Last Update" text={formatDistanceToNow(note.modifiedAt)} />
          ) : null}
          {note.locked ? <Detail.Metadata.Label title="Locked" text="Password-protected note" /> : null}
          {note.checklist ? (
            <Detail.Metadata.Label title="Checklist" text={note.checklistInProgress ? "In Progress" : "Completed"} />
          ) : null}
          {note.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {note.tags.map((tag) => {
                if (!tag.text) return null;
                <Detail.Metadata.TagList.Item key={tag.id} text={tag.text} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}
          {note.links.length > 0 ? (
            <Detail.Metadata.TagList title="Links">
              {note.links.map((link) => {
                const url = link.url;
                const text = link.text;
                if (url && text) {
                  return (
                    <Detail.Metadata.TagList.Item key={link.id} text={truncate(text)} onAction={() => open(url)} />
                  );
                }
              })}
            </Detail.Metadata.TagList>
          ) : null}
          {note.backlinks.length > 0 ? (
            <Detail.Metadata.TagList title="Backlinks">
              {note.backlinks.map((backlink) => (
                <Detail.Metadata.TagList.Item
                  key={backlink.id}
                  text={truncate(backlink.title)}
                  onAction={() => open(backlink.url)}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      isLoading={isLoading}
      actions={<NoteActions note={note} isDeleted={isDeleted} mutate={mutate} isDetail />}
    />
  );
}
