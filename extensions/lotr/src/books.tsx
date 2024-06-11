import { Book, Chapter } from "./types";
import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import ErrorComponent from "./ErrorComponent";
import { useLOTR } from "./utils/useLOTR";
import { DEFAULT_ICON } from "./constants";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

export default function Books() {
  const { isLoading, data, error } = useLOTR<Book>(`book`, "Books");

  return error ? (
    <ErrorComponent message={error.message} />
  ) : (
    <Grid columns={3} isLoading={isLoading}>
      {data?.map((book) => (
        <Grid.Item
          key={book._id}
          title={book.name}
          content={DEFAULT_ICON}
          actions={
            <ActionPanel>
              <Action.Push title="View Chapters" target={<Chapters book={book} />} icon={Icon.Text} />
              <Action.CopyToClipboard title="Copy Title to Clipboard" content={book.name} icon={Icon.Clipboard} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function Chapters({ book }: { book: Book }) {
  const title = `Chapters in '${book.name}'`;
  const [totalChapters, setTotalChapters] = useCachedState(`${book._id}-chapters`, 0);
  const { isLoading, data, error, totalItems } = useLOTR<Chapter>(`book/${book._id}/chapter`, title);
  useEffect(() => {
    if (totalItems) setTotalChapters(totalItems);
  }, [totalItems]);

  return error ? (
    <ErrorComponent message={error.message} />
  ) : (
    <List navigationTitle={title} isLoading={isLoading}>
      {data && (
        <List.Section title={`${totalChapters} Chapters`}>
          {data.map((chapter, chapterIndex) => (
            <List.Item
              key={chapter._id}
              title={`${chapterIndex + 1} - ${chapter.chapterName}`}
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Chapter Name to Clipboard"
                    content={chapter.chapterName}
                    icon={Icon.Clipboard}
                  />
                  <Action.CopyToClipboard
                    title="Copy Chapter Number to Clipboard"
                    content={chapterIndex}
                    icon={Icon.Clipboard}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
