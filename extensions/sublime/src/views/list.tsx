import { ActionPanel, List, Action } from "@raycast/api";
import { getCardUrl } from "../utils/constants";
import { getEntityIcon, getIconPath } from "../utils/icons";
import { getRelativeTime } from "../utils/dates";
import { SublimeCardWithMarkdown } from "../utils/markdown";

export default function CardsList({
    searchBarPlaceholder,
    searchBarAccessory,
    cards,
    isLoading,
    pagination,
    onSearchTextChange,
}: {
    searchBarPlaceholder: string;
    searchBarAccessory?: JSX.Element;
    cards?: SublimeCardWithMarkdown[];
    isLoading: boolean;
    pagination: { pageSize: number; hasMore: boolean; onLoadMore: () => void };
    onSearchTextChange?: (text: string) => void;
}) {
    return (
        <List
            isShowingDetail={cards && cards.length > 0}
            searchBarPlaceholder={searchBarPlaceholder}
            isLoading={isLoading}
            filtering={!onSearchTextChange}
            throttle={!!onSearchTextChange}
            pagination={pagination}
            onSearchTextChange={onSearchTextChange}
            searchBarAccessory={searchBarAccessory}
        >
            <List.EmptyView
                icon={getIconPath(isLoading ? "" : "SEARCH")}
                title={isLoading ? "" : cards ? "No results found :(" : "Search your library or the Sublime network"}
            />

            {cards?.map((item) => (
                <List.Item
                    key={item.uuid}
                    title={
                        item.info?.content || item.name || item.text || item.description || item.smart_title?.[0] || ""
                    }
                    // subtitle={item.text || item.description}
                    accessories={[{ tag: getCardType(item.entity_type) }]}
                    icon={getEntityIcon(item)}
                    detail={
                        <List.Item.Detail
                            markdown={
                                (item.name ? `# ${item.name}\n` : "") +
                                item.markdown +
                                // Show thumbnail after text to avoid layout change
                                (item.thumbnail ? `<img alt="Card image" src="${item.thumbnail}" />` : "")
                                // `\n\n> ${JSON.stringify(item, null, 2)}`
                            }
                            metadata={
                                <List.Item.Detail.Metadata>
                                    {item.name && item.thumbnail && (
                                        <List.Item.Detail.Metadata.Label title="Title" text={item.name} />
                                    )}
                                    {item.entity_type === "actor.member" && (
                                        <List.Item.Detail.Metadata.Label title="Username" text={`@${item.slug}`} />
                                    )}

                                    {(item.viewer?.staff_pick || item.viewer?.favorite || item.viewer?.following) && (
                                        <List.Item.Detail.Metadata.Label
                                            title="Tags"
                                            text={[
                                                item.viewer?.staff_pick ? "Staff Pick" : "",
                                                item.viewer?.favorite ? "Favorite" : "",
                                                item.viewer?.following ? "Following" : "",
                                            ]
                                                .filter(Boolean)
                                                .join(", ")}
                                        />
                                    )}

                                    {/* {item.description && (
                                        <List.Item.Detail.Metadata.Label title="Description" text={item.description} />
                                    )} */}

                                    {(item.privacy === "public" || item.privacy === "private") && (
                                        <List.Item.Detail.Metadata.Label
                                            title="Privacy"
                                            text={item.privacy === "public" ? "Anyone can add" : "Private"}
                                        />
                                    )}

                                    {(item.source || item.domain) && (
                                        <List.Item.Detail.Metadata.Label
                                            title="Source"
                                            text={
                                                item.source
                                                    ? `${item.source.name} (${item.source.domain})`
                                                    : item.domain
                                            }
                                        />
                                    )}
                                    {item.authors[0] && (
                                        <List.Item.Detail.Metadata.Label title="Author" text={item.authors[0]} />
                                    )}
                                    {item.curated_by?.first && (
                                        <List.Item.Detail.Metadata.Label
                                            title={item.number_of_cards ? "By" : "Added by"}
                                            text={
                                                item.curated_by.first.name +
                                                (item.curated_by.others > 0
                                                    ? ` and ${item.curated_by.others} others`
                                                    : "")
                                            }
                                        />
                                    )}
                                    <List.Item.Detail.Metadata.Label
                                        title="Updated"
                                        text={getRelativeTime(item.last_updated_at)}
                                    />

                                    {item.number_of_cards ? (
                                        <List.Item.Detail.Metadata.Label
                                            title="Cards"
                                            text={`${item.number_of_cards}`}
                                        />
                                    ) : (
                                        item.number_of_connections &&
                                        item.number_of_connections > 1 && (
                                            <List.Item.Detail.Metadata.Label
                                                title="Connections"
                                                text={`${item.number_of_connections}`}
                                            />
                                        )
                                    )}
                                    {item.number_of_public_highlights && (
                                        <List.Item.Detail.Metadata.Label
                                            title="Highlights"
                                            text={`${item.number_of_public_highlights}`}
                                        />
                                    )}
                                </List.Item.Detail.Metadata>
                            }
                        />
                    }
                    actions={
                        <ActionPanel>
                            <Action.OpenInBrowser title="Open Card" url={getCardUrl(item)} />
                            {(item.urls[0] || item.source?.url) && (
                                <Action.OpenInBrowser title="Open Source" url={item.urls[0] || item.source!.url} />
                            )}
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    );
}

function getCardType(entity_type: string) {
    const typeName = entity_type.split(".").pop()?.split("_").pop() || "";
    return typeName[0].toUpperCase() + typeName.slice(1);
}
