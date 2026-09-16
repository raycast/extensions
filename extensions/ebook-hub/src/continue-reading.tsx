import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";

import { Reader } from "./components/Reader";
import { getLibraryStore, readLastOpened } from "./storage";
import { LibraryError, type LibraryStore } from "./storage/library-store";

async function findLastOpenedBook(store: LibraryStore): Promise<string | null> {
  const bookId = await readLastOpened();
  if (!bookId) {
    return null;
  }
  try {
    await store.get(bookId);
    return bookId;
  } catch (error) {
    if (error instanceof LibraryError && error.code !== "io") {
      return null;
    }
    throw error;
  }
}

export default function Command() {
  const store = useMemo(getLibraryStore, []);
  const { data: bookId, isLoading, error } = usePromise(findLastOpenedBook, [store]);

  if (isLoading) {
    return <Detail isLoading markdown="" />;
  }
  if (bookId) {
    return <Reader bookId={bookId} />;
  }
  return (
    <Detail
      markdown={
        error
          ? `# Could not open your last book\n\n${error.message}`
          : "# Nothing to continue\n\nOpen a book from **My Library** to start reading."
      }
      actions={
        <ActionPanel>
          <Action
            title="Open My Library"
            icon={Icon.Book}
            onAction={() => launchCommand({ name: "library", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    />
  );
}
