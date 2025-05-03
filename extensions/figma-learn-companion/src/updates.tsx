import { Action, ActionPanel, List, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import Parser from "rss-parser";
import { FigmaColors, identifyMentionedProducts } from "./util";

interface UpdateItem {
    title: string;
    link: string;
    pubDate: string;
    content: string;
    products: string[];
}

export default function Command() {
    const [isLoading, setIsLoading] = useState(true);
    const [updates, setUpdates] = useState<UpdateItem[]>([]);
    const parser = new Parser();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await parser.parseURL("https://www.figma.com/release-notes/feed/atom.xml");
                result.items?.forEach((item) => {
                    item.products = identifyMentionedProducts(item.content!, "Figma");
                    setUpdates((updates) => [...updates, item as UpdateItem]);
                });
                setIsLoading(false);
            } catch (error) {
                showToast(Toast.Style.Failure, "Failed to fetch updates", "Please try again later.");
            }
        };

        fetchData();
    }, []);

    return (
        <List isLoading={isLoading} throttle={true} searchBarPlaceholder="Search updates">
            {updates.map((update, index) => (
                <List.Item
                    key={index}
                    title={update.title}
                    keywords={update.products}
                    accessories={[
                        { text: new Date(update.pubDate).toLocaleDateString() },
                        { icon: Icon.Tag, tag: { value: update.products.join(", "), color: FigmaColors.Purple } },
                    ]}
                    actions={
                        <ActionPanel title="Figma Learn">
                            <Action.OpenInBrowser title="Open in Browser" icon="arrow.right.circle" url={update.link} />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}
