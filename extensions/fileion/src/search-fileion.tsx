import { Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { TitleActions } from "./actions";
import { PageActions } from "./content-actions";
import {
    SearchFilter,
    SearchResults as Results,
    effectiveSelection,
    getQuestion,
    logoUrl,
    rowId,
    searchAll,
    slugOfRow,
    toolIconUrl,
} from "./lib";
import { ErrorView } from "./error-view";
import { ArticleDetail, QuestionDetail, SoftwareDetail, ToolDetail } from "./details";
import { useDetails } from "./useDetails";

const EMPTY: Results = { software: [], tools: [], qa: [], articles: [] };

export default function SearchFileion() {
    const [text, setText] = useState("");
    const [filter, setFilter] = useState<SearchFilter>("all");
    const [reported, setReported] = useState<string | null>(null);
    const query = text.trim();

    // throttle: Raycast waits for a pause in typing before it calls onSearchTextChange
    const { data, isLoading, error } = usePromise(
        async (q: string, f: SearchFilter) => (q.length >= 2 ? await searchAll(q, f) : EMPTY),
        [query, filter],
    );
    const results = data ?? EMPTY;
    const total = results.software.length + results.tools.length + results.qa.length + results.articles.length;

    const ids = [
        ...results.software.map((r) => rowId("software", r.slug)),
        ...results.tools.map((r) => rowId("tools", r.slug)),
        ...results.qa.map((r) => rowId("qa", r.slug)),
        ...results.articles.map((r) => rowId("articles", r.slug)),
    ];
    // Raycast may not report the first selection when results arrive: the first result is then the selected one
    const selected = effectiveSelection(reported, ids);
    // the trust line (a second request) only for a row the person moved to; the first row shows the versions
    const entry = useDetails(slugOfRow(selected, "software"), reported !== null);
    const questionSlug = slugOfRow(selected, "qa");
    const { data: question } = usePromise(
        async (slug: string | null) => (slug ? await getQuestion(slug) : undefined),
        [questionSlug],
    );

    return (
        <List
            isLoading={isLoading}
            isShowingDetail={total > 0}
            throttle
            onSearchTextChange={setText}
            onSelectionChange={setReported}
            searchBarPlaceholder="Search software, tools, Q&A and articles on Fileion.Com"
            searchBarAccessory={
                <List.Dropdown
                    tooltip="Show"
                    storeValue
                    defaultValue="all"
                    onChange={(v) => setFilter(v as SearchFilter)}
                >
                    <List.Dropdown.Item title="All" value="all" />
                    <List.Dropdown.Item title="Software" value="software" />
                    <List.Dropdown.Item title="Tools" value="tools" />
                    <List.Dropdown.Item title="Q&A" value="qa" />
                    <List.Dropdown.Item title="Articles" value="articles" />
                </List.Dropdown>
            }
        >
            {error ? (
                <ErrorView error={error} title="Could not search Fileion" />
            ) : query.length < 2 ? (
                <List.EmptyView
                    icon={Icon.MagnifyingGlass}
                    title="Search Fileion"
                    description="Type at least 2 letters: a program, a tool, a question or an article."
                />
            ) : (
                <List.EmptyView
                    icon={Icon.MagnifyingGlass}
                    title="Nothing found"
                    description={`Nothing on Fileion matches “${query}”.`}
                />
            )}
            {results.software.length > 0 && (
                <List.Section title="Software" subtitle={String(results.software.length)}>
                    {results.software.map((item) => {
                        const e = entry(item.slug);
                        const software = e.detail?.software;
                        const logo = logoUrl(software?.logo);
                        return (
                            <List.Item
                                key={rowId("software", item.slug)}
                                id={rowId("software", item.slug)}
                                title={item.name}
                                icon={logo ? { source: logo } : Icon.AppWindow}
                                detail={<SoftwareDetail item={item} entry={e} />}
                                actions={
                                    <TitleActions url={item.url} platforms={item.platforms} latest={software?.latest} />
                                }
                            />
                        );
                    })}
                </List.Section>
            )}
            {results.tools.length > 0 && (
                <List.Section title="Tools" subtitle={String(results.tools.length)}>
                    {results.tools.map((tool) => (
                        <List.Item
                            key={rowId("tools", tool.slug)}
                            id={rowId("tools", tool.slug)}
                            title={tool.name}
                            icon={toolIconUrl(tool) ? { source: toolIconUrl(tool) as string } : Icon.Hammer}
                            detail={<ToolDetail tool={tool} />}
                            actions={<PageActions url={tool.url} title="Open Tool on Fileion" />}
                        />
                    ))}
                </List.Section>
            )}
            {results.qa.length > 0 && (
                <List.Section title="Q&A" subtitle={String(results.qa.length)}>
                    {results.qa.map((q) => (
                        <List.Item
                            key={rowId("qa", q.slug)}
                            id={rowId("qa", q.slug)}
                            title={q.title}
                            icon={q.accepted ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.QuestionMark}
                            detail={<QuestionDetail q={q} full={questionSlug === q.slug ? question : undefined} />}
                            actions={<PageActions url={q.url} title="Open Question on Fileion" />}
                        />
                    ))}
                </List.Section>
            )}
            {results.articles.length > 0 && (
                <List.Section title="Articles" subtitle={String(results.articles.length)}>
                    {results.articles.map((a) => (
                        <List.Item
                            key={rowId("articles", a.slug)}
                            id={rowId("articles", a.slug)}
                            title={a.title}
                            icon={a.type === "news" ? Icon.Megaphone : Icon.Document}
                            detail={<ArticleDetail a={a} />}
                            actions={<PageActions url={a.url} title="Read Article on Fileion" />}
                        />
                    ))}
                </List.Section>
            )}
        </List>
    );
}
