/* eslint-disable @typescript-eslint/no-unused-vars */

import { List, Icon, Action, ActionPanel, useNavigation, LocalStorage, Color } from "@raycast/api";
import { launchCommand, LaunchType } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ScryfallSet, ScryfallSetQuery } from "./types";

export default function CommandSearchCards() {
    const { isLoading, data } = useFetch<ScryfallSetQuery>(`https://api.scryfall.com/sets`, {
        // to make sure the screen isn't flickering when the searchText changes
        keepPreviousData: true,
    });

    const { push } = useNavigation();

    return (
        <List searchBarPlaceholder="Search for sets" isLoading={isLoading} throttle>
            {!isLoading &&
                data?.data.map((set) => (
                    <List.Item
                        key={set.id}
                        icon={{ source: set.icon_svg_uri, tintColor: Color.PrimaryText }}
                        title={set.name}
                        subtitle={`${set.card_count.toString()} cards`}
                        accessories={[
                            { tag: { color: Color.Red, value: `Code: ${set.code}` }, icon: Icon.Hashtag },
                            { tag: `Release: ${set.released_at}`, icon: Icon.Calendar },
                        ]}
                        actions={
                            <ActionPanel>
                                <Action
                                    title="View Cards in Set"
                                    icon={Icon.ArrowRight}
                                    onAction={() => {
                                        launchCommand({
                                            name: "searchCards",
                                            type: LaunchType.UserInitiated,
                                            context: { data: `s:${set.code}` },
                                        });
                                    }}
                                />
                            </ActionPanel>
                        }
                    />
                ))}
        </List>
    );
}
