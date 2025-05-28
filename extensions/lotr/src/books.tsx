import { Book, Chapter, SuccessResponse } from "./types";
import { Action, ActionPanel, Grid, Icon, List, Toast, showToast } from "@raycast/api";
import ErrorComponent from "./ErrorComponent";
import { API_HEADERS, API_URL, DEFAULT_ICON } from "./constants";
import { useFetch } from "@raycast/utils";

export default function Books() {
  const { isLoading, data, error } = useFetch(API_URL + "book", {
    headers: API_HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching Books`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: SuccessResponse<Book>) {
      return {
        data: result.docs,
      };
    },
    async onData(data) {
      await showToast({
        title: `Fetched ${data.length} Books`,
        style: Toast.Style.Success,
      });
    },
  });

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

  const { isLoading, data, error } = useFetch(API_URL + `book/${book._id}/chapter`, {
    headers: API_HEADERS,
    async onWillExecute() {
      await showToast({
        title: `Fetching ${title}`,
        style: Toast.Style.Animated,
      });
    },
    mapResult(result: SuccessResponse<Chapter>) {
      return {
        data: result.docs,
      };
    },
    async onData(data) {
      await showToast({
        title: `Fetched ${data.length} Chapters`,
        style: Toast.Style.Success,
      });
    },
  });

  return error ? (
    <ErrorComponent message={error.message} />
  ) : (
    <List navigationTitle={title} isLoading={isLoading}>
      {data && (
        <List.Section title={`${data.length} Chapters`}>
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
