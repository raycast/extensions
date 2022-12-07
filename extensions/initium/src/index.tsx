import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";
import { NodeHtmlMarkdown } from "node-html-markdown";

const parser = new Parser({
    customFields: {
        item: [["content:encoded", "fullContent"]],
    },
});

interface Item extends Parser.Item {
    fullContent?: string;
}

const isBriefing = (title: string) => !!title.match(/^(早|晚)報：/);

const Briefing = ({ markdown }: { markdown: string }) => <Detail markdown={markdown} />;

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
                        target={<Briefing markdown={getMarkdown()} />}
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
    const [items, setItems] = useState<Item[]>();
    const [error, setError] = useState<Error>();
    const [filter, setFilter] = useState<string>("all");

    const fetchPosts = async () => {
        const initiumFeedURL = "https://theinitium.com/newsfeed/";

        try {
            const feed = await parser.parseURL(initiumFeedURL);
            setItems(feed.items);
        } catch (error) {
            setError(error instanceof Error ? error : undefined);
            console.log(error);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    return (
        <List
            isLoading={!items && !error}
            searchBarAccessory={
                <List.Dropdown tooltip="Show posts filter" onChange={(newValue) => setFilter(newValue)}>
                    <List.Dropdown.Item title="All" value="all" />
                    <List.Dropdown.Item title="Briefings" value="briefing" />
                    <List.Dropdown.Item title="Articles" value="article" />
                </List.Dropdown>
            }
            searchBarPlaceholder="Posts on Initium Media"
        >
            {items
                ?.filter((item) => {
                    if (!item.title) return false;
                    if (filter === "all") return true;

                    return (filter === "briefing") === isBriefing(item.title);
                })
                .map((item) => (
                    <PostListItem key={item.guid} item={item} />
                ))}
        </List>
    );
};

export default Command;
