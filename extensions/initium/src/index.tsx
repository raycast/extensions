import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useFetch } from "@raycast/utils";

interface Item extends Parser.Item {
    fullContent?: string;
}

const isBriefing = (title: string) => !!title.match(/^(早|晚)報：/);
const Briefing = ({ title, markdown }: { title: string | undefined; markdown: string }) => (
    <Detail navigationTitle={title} markdown={markdown} />
);
const PostListItem = ({ item }: { item: Item }) => {
    const getMarkdown = () => {
        if (!item.fullContent) {
            return "Not Available";
        }
        return `# ${item.title}\n` + NodeHtmlMarkdown.translate(item.fullContent);
    };

    const getSubtitle = () => {
        if (!item.isoDate) {
            return undefined;
        }

        const getYMD = (date: Date) => ({
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate(),
        });

        const published = getYMD(new Date(item.isoDate));
        const now = getYMD(new Date());

        if (published.year === now.year && published.month === now.month) {
            if (published.day === now.day) {
                return "Today";
            } else if (now.day - published.day === 1) {
                return "Yesterday";
            } else if (now.day - published.day <= 7) {
                return `${now.day - published.day} days ago`;
            }
        }

        return `${published.year === now.year ? "" : `${published.year} `} ${published.month}/${published.day}`;
    };

    const Actions = () => (
        <ActionPanel title={item.title}>
            <ActionPanel.Section>
                {item.link && <Action.OpenInBrowser url={item.link} />}
                {
                    <Action.Push
                        title="Read in Raycast"
                        target={<Briefing title={item.title} markdown={getMarkdown()} />}
                        icon={Icon.Star}
                    />
                }
            </ActionPanel.Section>
        </ActionPanel>
    );

    return (
        <List.Item
            title={item.title ?? "[Not Available]"}
            subtitle={item.creator ?? undefined}
            accessories={[
                {
                    text: getSubtitle(),
                },
            ]}
            actions={<Actions />}
        />
    );
};

const Command = () => {
    const [filter, setFilter] = useState<string>("all");

    const { isLoading, data } = useFetch("https://theinitium.com/newsfeed/", {
        async parseResponse(response) {
            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const data = await response.text();
            if (data !== undefined) {
                const parser: Parser = new Parser({
                    customFields: {
                        item: [["content:encoded", "fullContent"]],
                    },
                });
                const feed = await parser.parseString(data as string);

                return { items: feed.items as Item[] };
            }
            return { items: [] };
        },
    });

    return (
        <List
            isLoading={isLoading}
            searchBarAccessory={
                <List.Dropdown tooltip="Show posts filter" onChange={(newValue) => setFilter(newValue)}>
                    <List.Dropdown.Item title="All" value="all" />
                    <List.Dropdown.Item title="Briefings" value="briefing" />
                    <List.Dropdown.Item title="Articles" value="article" />
                </List.Dropdown>
            }
            searchBarPlaceholder="Posts on Initium Media"
        >
            {data &&
                data.items
                    .filter((item) => {
                        if (!item.title) return false;
                        if (filter === "all") return true;

                        return (filter === "briefing") === isBriefing(item.title);
                    })
                    .map((item) => <PostListItem key={item.guid} item={item} />)}
        </List>
    );
};

export default Command;
