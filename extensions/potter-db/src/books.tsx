import { usePotterDB } from "./utils/usePotterDB";
import { Book, Chapter } from "./types";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

export default function Books() {
    const { data: books, isLoading } = usePotterDB<Book>("books", "Books");

    return <List isLoading={isLoading} isShowingDetail>
        <List.Section title="Harry Potter and">
            {books?.map(book => <List.Item key={book.id} title={book.attributes.title.replace("Harry Potter and", "...")} icon={book.attributes.cover} detail={<List.Item.Detail markdown={`![Illustration](${book.attributes.cover}) \n\n ${book.attributes.summary}`} metadata={<List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="ID" text={book.id} />                
                <List.Item.Detail.Metadata.Label title="slug" text={book.attributes.slug} />
                <List.Item.Detail.Metadata.Label title="author" text={book.attributes.author} />
                <List.Item.Detail.Metadata.Label title="cover" text={book.attributes.cover} />
                <List.Item.Detail.Metadata.Label title="dedication" text={book.attributes.dedication} />
                <List.Item.Detail.Metadata.Label title="pages" text={book.attributes.pages.toString()} />
                <List.Item.Detail.Metadata.Label title="release_date" text={book.attributes.release_date} />
                <List.Item.Detail.Metadata.Label title="summary" text={book.attributes.summary} />
                <List.Item.Detail.Metadata.Label title="title" text={book.attributes.title} />
                <List.Item.Detail.Metadata.Link title="wiki" text={book.attributes.wiki} target={book.attributes.wiki} />
            </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
                <Action.Push title="View Chapters" icon={Icon.Text} target={<Chapters book={book} />} />
            </ActionPanel>} />)}
        </List.Section>
    </List>
}

type ChapterProps = {
    book: Book;
}
function Chapters({ book }: ChapterProps) {
    const { data: chapters, isLoading } = usePotterDB<Chapter>(`books/${book.id}/chapters`, `Chapters in "${book.attributes.title}"`);

    return <List isLoading={isLoading} navigationTitle="Chapters" isShowingDetail>
        {chapters?.map(chapter => <List.Item key={chapter.id} title={chapter.attributes.order + " " + chapter.attributes.title} detail={<List.Item.Detail markdown={chapter.attributes.summary} />} />)}
    </List>
}