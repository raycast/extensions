import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { Topic } from "./types";
import useHelpCenter from "./hooks/useHelpCenter";
import { FigmaColors } from "./util";

const featuredTopics: Topic[] = [
    {
        title: "Mini projects",
        category: "Get started",
        url: "https://help.figma.com/hc/en-us/sections/13148624530967-Mini-projects",
    },
    {
        title: "Explore auto layout properties",
        category: "Use auto layout",
        url: "https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties",
    },
    {
        title: "Guide to text",
        category: "Typography",
        url: "https://help.figma.com/hc/en-us/articles/360039956434-Guide-to-text",
    },
    {
        title: "Guide to billing at Figma",
        category: "Billing",
        url: "https://help.figma.com/hc/en-us/articles/360050602593-Guide-to-billing-at-Figma",
    },
    {
        title: "Whats new in Dev Mode?",
        category: "Dev Mode",
        url: "https://help.figma.com/hc/en-us/articles/20652568757399-What-s-new-in-Dev-Mode",
    },
    {
        title: "Create and manage variables",
        category: "Variables",
        url: "https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables",
    },
];

export default function Command() {
    const [searchText, setSearchText] = useState("");
    const { isLoading, searchHelpCenter, foundTopics } = useHelpCenter();

    useEffect(() => {
        if (searchText.length > 0) {
            searchHelpCenter(searchText);
        }
    }, [searchText]);

    return (
        <List
            isLoading={isLoading}
            searchBarPlaceholder="Search for a topic on Figma Learn"
            onSearchTextChange={setSearchText}
            throttle={true}
        >
            {/* Placeholder content before searching, featured topics and more resources */}
            {searchText.length == 0 && (
                <>
                    <List.Section title="Featured topics">
                        {featuredTopics.map((topic) => (
                            <List.Item
                                title={topic.title}
                                key={topic.title}
                                accessories={[
                                    {
                                        tag: { value: topic.category, color: FigmaColors.Purple },
                                        icon: Icon.Tag,
                                    },
                                ]}
                                actions={
                                    <ActionPanel title="Figma Learn">
                                        <Action.OpenInBrowser url={topic.url} />
                                    </ActionPanel>
                                }
                            />
                        ))}
                    </List.Section>
                    <List.Section title="Misc">
                        <List.Item
                            title={"Troubleshooting"}
                            icon={Icon.QuestionMark}
                            actions={
                                <ActionPanel title="Figma Learn">
                                    <Action.OpenInBrowser url="https://help.figma.com/hc/en-us/sections/1500000378401-Troubleshoot" />
                                </ActionPanel>
                            }
                        />
                        <List.Item
                            title={"More resources"}
                            icon={Icon.ArrowRight}
                            actions={
                                <ActionPanel title="Figma Learn">
                                    <Action.OpenInBrowser url="https://help.figma.com/hc/en-us/categories/6448726686615" />
                                </ActionPanel>
                            }
                        />
                    </List.Section>
                </>
            )}
            {/* Results */}
            {searchText.length > 0 && (
                <>
                    {foundTopics.map((topic, index) => (
                        <List.Item
                            title={topic.title}
                            key={index}
                            accessories={[
                                {
                                    tag: { value: topic.category, color: FigmaColors.Purple },
                                    icon: Icon.Tag,
                                },
                            ]}
                            actions={
                                <ActionPanel title="Figma Learn">
                                    <Action.OpenInBrowser url={topic.url} />
                                </ActionPanel>
                            }
                        />
                    ))}
                </>
            )}
        </List>
    );
}
