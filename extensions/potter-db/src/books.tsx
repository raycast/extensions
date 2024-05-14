import { usePotterDB } from "./utils/usePotterDB";
import { Book, Chapter } from "./types";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

export default function Books() {
  const { data: books, isLoading } = usePotterDB<Book>("books", "Books");

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title="Harry Potter and ...">
        {books?.map((book) => (
          <List.Item
            key={book.id}
            title={book.attributes.title.replace("Harry Potter and", "...")}
            icon={book.attributes.cover}
            detail={
              <List.Item.Detail
                markdown={`![Illustration](${book.attributes.cover}) \n\n ${book.attributes.summary}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={book.id} />
                    <List.Item.Detail.Metadata.Label title="Slug" text={book.attributes.slug} />
                    <List.Item.Detail.Metadata.Label title="Author" text={book.attributes.author} />
                    <List.Item.Detail.Metadata.Label title="Cover" text={book.attributes.cover} />
                    <List.Item.Detail.Metadata.Label title="Dedication" text={book.attributes.dedication} />
                    <List.Item.Detail.Metadata.Label title="Pages" text={book.attributes.pages.toString()} />
                    <List.Item.Detail.Metadata.Label title="Release Date" text={book.attributes.release_date} />
                    <List.Item.Detail.Metadata.Label title="Summary" text={book.attributes.summary} />
                    <List.Item.Detail.Metadata.Label title="Title" text={book.attributes.title} />
                    <List.Item.Detail.Metadata.Link
                      title="Wiki"
                      text={book.attributes.wiki}
                      target={book.attributes.wiki}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push title="View Chapters" icon={Icon.Text} target={<Chapters book={book} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

type ChapterProps = {
  book: Book;
};
function Chapters({ book }: ChapterProps) {
  const { data: chapters, isLoading } = usePotterDB<Chapter>(
    `books/${book.id}/chapters`,
    `Chapters in "${book.attributes.title}"`,
  );

  return (
    <List isLoading={isLoading} navigationTitle="Chapters" isShowingDetail>
      {chapters?.map((chapter) => (
        <List.Item
          key={chapter.id}
          title={chapter.attributes.order + ". " + chapter.attributes.title}
          detail={<List.Item.Detail markdown={chapter.attributes.summary || "<NO SUMMARY>"} />}
        />
      ))}
    </List>
  );
}
