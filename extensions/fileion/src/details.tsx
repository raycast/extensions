import { Color, List } from "@raycast/api";
import {
    ContentArticle,
    ContentQuestion,
    ContentTool,
    Software,
    answerLabel,
    articleMarkdown,
    articleTypeLabel,
    detailMarkdown,
    isoDay,
    questionMarkdown,
    readingLabel,
    toolMarkdown,
} from "./lib";
import { DetailEntry } from "./useDetails";

/** The preview panels of Search Fileion and Recent Updates: one per kind of result */
export function SoftwareDetail({ item, entry }: { item: Software; entry: DetailEntry }) {
    const software = entry.detail?.software ?? item;
    const trust = entry.detail?.trust;
    return (
        <List.Item.Detail
            isLoading={entry.state === "loading"}
            markdown={detailMarkdown(software, entry.state, entry.detail?.software.latest)}
            metadata={
                <List.Item.Detail.Metadata>
                    {software.publisher ? (
                        <List.Item.Detail.Metadata.Label title="Publisher" text={software.publisher.name} />
                    ) : null}
                    {software.category ? (
                        <List.Item.Detail.Metadata.Label title="Category" text={software.category.title} />
                    ) : null}
                    {trust ? <List.Item.Detail.Metadata.Label title="Checks" text={trust} /> : null}
                    <List.Item.Detail.Metadata.Link
                        title="On Fileion"
                        target={software.url}
                        text={software.url.replace(/^https:\/\//, "")}
                    />
                </List.Item.Detail.Metadata>
            }
        />
    );
}

export function ToolDetail({ tool }: { tool: ContentTool }) {
    return (
        <List.Item.Detail
            markdown={toolMarkdown(tool)}
            metadata={
                <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Category" text={tool.category.title} />
                    <List.Item.Detail.Metadata.Link title="Open tool" target={tool.url} text="Open tool" />
                </List.Item.Detail.Metadata>
            }
        />
    );
}

export function QuestionDetail({ q, full }: { q: ContentQuestion; full?: ContentQuestion }) {
    const date = isoDay(q.created_at);
    return (
        <List.Item.Detail
            markdown={questionMarkdown(q, full)}
            metadata={
                <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Answers" text={answerLabel(q.answer_count)} />
                    {q.accepted ? (
                        <List.Item.Detail.Metadata.TagList title="Status">
                            <List.Item.Detail.Metadata.TagList.Item text="Accepted" color={Color.Green} />
                        </List.Item.Detail.Metadata.TagList>
                    ) : null}
                    {date ? <List.Item.Detail.Metadata.Label title="Asked" text={date} /> : null}
                    <List.Item.Detail.Metadata.Link title="On Fileion" target={q.url} text="Open question" />
                </List.Item.Detail.Metadata>
            }
        />
    );
}

export function ArticleDetail({ a }: { a: ContentArticle }) {
    const date = isoDay(a.published_at);
    const reading = readingLabel(a.reading_minutes);
    return (
        <List.Item.Detail
            markdown={articleMarkdown(a)}
            metadata={
                <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Type" text={articleTypeLabel(a.type)} />
                    {a.author ? <List.Item.Detail.Metadata.Label title="Author" text={a.author} /> : null}
                    {date ? <List.Item.Detail.Metadata.Label title="Published" text={date} /> : null}
                    {reading ? <List.Item.Detail.Metadata.Label title="Reading time" text={reading} /> : null}
                    <List.Item.Detail.Metadata.Link title="On Fileion" target={a.url} text="Read article" />
                </List.Item.Detail.Metadata>
            }
        />
    );
}
