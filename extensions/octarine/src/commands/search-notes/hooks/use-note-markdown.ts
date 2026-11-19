import { readFile } from "node:fs/promises";
import path from "node:path";
import { usePromise } from "@raycast/utils";
import { splitMarkdownFrontmatter } from "@lib/files";
import type { IndexedNote } from "@type/notes";

export function useNoteMarkdown(note: IndexedNote) {
  const workspacePath = note.folder.workspace.path;
  const file = path.join(workspacePath, note.path);
  const { data, error, isLoading } = usePromise(
    async (file: string) => {
      const content = await readFile(file, "utf8");
      const frontmatter = splitMarkdownFrontmatter(content);
      return { markdown: frontmatter?.body ?? content };
    },
    [file],
    {
      onError: (error) => {
        console.error("Failed to read note preview", error);
      },
    },
  );
  let markdown = data?.markdown ?? "";
  if (error) {
    markdown = "# Preview unavailable\n\nThe note could not be read. It may have been moved or deleted.";
  } else if (!isLoading && !markdown.trim()) {
    markdown = "_This note is empty._";
  }

  return { markdown, isLoading };
}
