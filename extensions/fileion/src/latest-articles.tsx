import { Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorView } from "./error-view";
import { PageActions } from "./content-actions";
import { ArticleFilter, articleTypeLabel, day, getArticles, imageUrl, oneLine } from "./lib";

export default function LatestArticles() {
    const [text, setText] = useState("");
    const [filter, setFilter] = useState<ArticleFilter>("all");
    const { data, isLoading, error } = usePromise(
        (q: string, type: ArticleFilter) => getArticles(q, type),
        [text, filter],
    );

    return (
        <List
            isLoading={isLoading}
            throttle
            onSearchTextChange={setText}
            searchBarPlaceholder="Search Fileion articles"
            searchBarAccessory={
                <List.Dropdown tooltip="Show" value={filter} onChange={(v) => setFilter(v as ArticleFilter)}>
                    <List.Dropdown.Item title="All Articles" value="all" />
                    <List.Dropdown.Item title="Blog" value="blog" />
                    <List.Dropdown.Item title="News" value="news" />
                </List.Dropdown>
            }
        >
            {error ? (
                <ErrorView error={error} title="Could not load articles" />
            ) : (
                <List.EmptyView
                    icon={Icon.Document}
                    title="No article found"
                    description={
                        text.trim() ? `No article matches “${text.trim()}”.` : "There are no articles to show."
                    }
                />
            )}
            {(data ?? []).map((a) => (
                <List.Item
                    key={a.slug}
                    title={a.title}
                    subtitle={a.topic?.title}
                    icon={imageUrl(a.image) ? { source: imageUrl(a.image) as string } : Icon.Document}
                    keywords={[a.author ?? "", oneLine(a.excerpt)].filter(Boolean)}
                    accessories={[
                        {
                            tag: {
                                value: articleTypeLabel(a.type),
                                color: a.type === "news" ? Color.Orange : Color.Blue,
                            },
                        },
                        ...(a.published_at ? [{ text: day(a.published_at.slice(0, 10)) }] : []),
                    ]}
                    actions={<PageActions url={a.url} title="Read Article on Fileion" />}
                />
            ))}
        </List>
    );
}
