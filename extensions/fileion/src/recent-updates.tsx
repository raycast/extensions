import { Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { TitleActions } from "./actions";
import { PageActions } from "./content-actions";
import { ArticleDetail, QuestionDetail, SoftwareDetail, ToolDetail } from "./details";
import {
    ContentArticle,
    ContentQuestion,
    ContentTool,
    SearchFilter,
    Update,
    day,
    effectiveSelection,
    getArticles,
    getQuestion,
    getQuestions,
    getTools,
    getUpdates,
    logoUrl,
    platformName,
    rowId,
    sectionsOf,
    slugOfRow,
    softwareUrlOf,
    toolIconUrl,
} from "./lib";
import { ErrorView } from "./error-view";
import { useDetails } from "./useDetails";

type Recent = { updates: Update[]; tools: ContentTool[]; qa: ContentQuestion[]; articles: ContentArticle[] };

/** The newest of each kind, newest first (the API lists), only for the sections the filter shows; fails only when every asked section fails */
async function loadRecent(filter: SearchFilter): Promise<Recent> {
    const on = sectionsOf(filter);
    const out: Recent = { updates: [], tools: [], qa: [], articles: [] };
    const asked: Promise<unknown>[] = [];
    if (on.software) asked.push(getUpdates().then((r) => (out.updates = r)));
    if (on.tools) asked.push(getTools("", undefined, "recent").then((r) => (out.tools = r)));
    if (on.qa) asked.push(getQuestions("").then((r) => (out.qa = r)));
    if (on.articles) asked.push(getArticles("", "all").then((r) => (out.articles = r)));
    const settled = await Promise.allSettled(asked);
    const failed = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed.length === settled.length && failed.length > 0) throw failed[0].reason;
    return out;
}

export default function RecentUpdates() {
    const [filter, setFilter] = useState<SearchFilter>("all");
    const { data, isLoading, error, revalidate } = usePromise((f: SearchFilter) => loadRecent(f), [filter]);
    const [reported, setReported] = useState<string | null>(null);
    const recent: Recent = data ?? { updates: [], tools: [], qa: [], articles: [] };
    const byDay = new Map<string, Update[]>();
    for (const u of recent.updates) byDay.set(u.released_at, [...(byDay.get(u.released_at) ?? []), u]);

    const ids = [
        ...recent.updates.map((u) => rowId("software", String(u.id))),
        ...recent.tools.map((t) => rowId("tools", t.slug)),
        ...recent.qa.map((q) => rowId("qa", q.slug)),
        ...recent.articles.map((a) => rowId("articles", a.slug)),
    ];
    const selected = effectiveSelection(reported, ids);
    const selectedUpdate = recent.updates.find((u) => rowId("software", String(u.id)) === selected);
    const entry = useDetails(selectedUpdate?.software.slug ?? null, reported !== null);
    const questionSlug = slugOfRow(selected, "qa");
    const { data: question } = usePromise(
        async (slug: string | null) => (slug ? await getQuestion(slug) : undefined),
        [questionSlug],
    );
    const total = ids.length;

    return (
        <List
            isLoading={isLoading}
            isShowingDetail={total > 0}
            searchBarPlaceholder="Filter what is new on Fileion"
            onSelectionChange={setReported}
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
            {error ? <ErrorView error={error} title="Could not load what is new" onRetry={revalidate} /> : null}
            {[...byDay.entries()].map(([released, updates]) => (
                <List.Section key={released} title={`Software · ${day(released) || "Date unknown"}`}>
                    {updates.map((u) => {
                        const e = entry(u.software.slug);
                        const software = e.detail?.software;
                        const logo = logoUrl(software?.logo);
                        const id = rowId("software", String(u.id));
                        return (
                            <List.Item
                                key={id}
                                id={id}
                                title={u.software.name}
                                subtitle={u.version}
                                icon={logo ? { source: logo } : Icon.AppWindow}
                                detail={
                                    <SoftwareDetail
                                        item={{
                                            slug: u.software.slug,
                                            name: u.software.name,
                                            url: softwareUrlOf(u),
                                            platforms: [u.platform],
                                        }}
                                        entry={e}
                                    />
                                }
                                actions={
                                    <TitleActions
                                        url={softwareUrlOf(u)}
                                        platforms={software?.platforms ?? [u.platform]}
                                        latest={software?.latest}
                                        preferred={u.platform}
                                        retry={e.retry}
                                    />
                                }
                                accessories={[{ tag: platformName(u.platform) }]}
                            />
                        );
                    })}
                </List.Section>
            ))}
            {recent.tools.length > 0 && (
                <List.Section title="Tools" subtitle="newest first">
                    {recent.tools.map((tool) => (
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
            {recent.qa.length > 0 && (
                <List.Section title="Q&A" subtitle="newest first">
                    {recent.qa.map((q) => (
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
            {recent.articles.length > 0 && (
                <List.Section title="Articles" subtitle="newest first">
                    {recent.articles.map((a) => (
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
