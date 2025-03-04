import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import useASOIAF from "./lib/useASOIAF";
import { Book } from "./lib/types";

export default function Books() {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { isLoading, data: books } = useASOIAF<Book>("books");

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search book">
      <List.Section title={`${books?.length} books`}>
        {books?.map((book) => (
          <List.Item
            key={book.name}
            title={book.name}
            subtitle={isShowingDetail ? undefined : book.publisher}
            accessories={isShowingDetail ? undefined : [{ tag: book.isbn }, { date: new Date(book.released) }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={book.name} />
                    <List.Item.Detail.Metadata.Label title="ISBN" text={book.isbn} />
                    <List.Item.Detail.Metadata.TagList title="Authors">
                      {book.authors.map((author) => (
                        <List.Item.Detail.Metadata.TagList.Item key={author} text={author} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Number of Pages" text={book.numberOfPages.toString()} />
                    <List.Item.Detail.Metadata.Label title="Publisher" text={book.publisher} />
                    <List.Item.Detail.Metadata.Label title="Country" text={book.country} />
                    <List.Item.Detail.Metadata.Label title="Media Type" text={book.mediaType} />
                    <List.Item.Detail.Metadata.Label title="Released" text={book.released} />
                    <List.Item.Detail.Metadata.Label title="Characters" text={book.characters.length.toString()} />
                    <List.Item.Detail.Metadata.Label
                      title="POV Characters"
                      text={book.povCharacters.length.toString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Toggle Details"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
