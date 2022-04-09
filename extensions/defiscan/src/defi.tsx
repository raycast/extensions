import {ActionPanel, Action, List, Icon, Color} from "@raycast/api";
import {useState} from "react";

const baseUrl = "https://defiscan.live/";

export default function Command() {
    const [valueText, setValueText] = useState("");

    const items = (<List.Section title="Search">
        {valueText.length >= 1 && valueText.length < 10 && searchOption("Block ID / Hash", Color.Magenta, 'blocks', valueText)}
        {valueText.length == 64 && searchOption("Vault", Color.Magenta, 'vaults', valueText)}
        {valueText.length >= 30 && searchOption("Address", Color.Magenta, 'address', valueText)}
        {valueText.length == 64 && searchOption("Transaction", Color.Magenta, 'transactions', valueText)}
    </List.Section>);

    return (
        <List enableFiltering={false}
              navigationTitle="Search on DeFiScan.live"
              searchBarPlaceholder="Search by block id/hash, address, trx id or vault id"
              onSearchTextChange={setValueText}
              searchText={valueText}>
            {items}
            <List.Section title="Quicklinks">
                <List.Item
                    title="DEX"
                    icon={{source: Icon.Link, tintColor: Color.Magenta}}
                    actions={
                        <ActionPanel title="list DEX">
                            <Action.OpenInBrowser
                                url={baseUrl + "dex"}
                                shortcut={{modifiers: ["cmd"], key: "d"}}
                            />
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Vaults"
                    icon={{source: Icon.Link, tintColor: Color.Magenta}}
                    actions={
                        <ActionPanel title="list Vaults">
                            <Action.OpenInBrowser
                                url={baseUrl + "vaults"}
                                shortcut={{modifiers: ["cmd"], key: "v"}}
                            />
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Blocks"
                    icon={{source: Icon.Link, tintColor: Color.Magenta}}
                    actions={
                        <ActionPanel title="list Blocks">
                            <Action.OpenInBrowser url={baseUrl + "blocks"}/>
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Masternodes"
                    icon={{source: Icon.Link, tintColor: Color.Magenta}}
                    actions={
                        <ActionPanel title="list Masternodes">
                            <Action.OpenInBrowser url={baseUrl + "masternodes"}/>
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Oracles"
                    icon={{source: Icon.Link, tintColor: Color.Magenta}}
                    actions={
                        <ActionPanel title="list Oracles">
                            <Action.OpenInBrowser url={baseUrl + "oracles"}/>
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Auctions"
                    icon={{source: Icon.Link, tintColor: Color.Magenta}}
                    actions={
                        <ActionPanel title="list Auctions">
                            <Action.OpenInBrowser url={baseUrl + "auctions"}/>
                        </ActionPanel>
                    }
                />
            </List.Section>
        </List>
    );
}

function searchOption(title: string, color: Color, link: string, value: string) {
    return (
        <List.Item
            title={title}
            icon={{source: Icon.MagnifyingGlass, tintColor: color}}
            actions={
                <ActionPanel title={title}>
                    <Action.OpenInBrowser url={baseUrl + link + "/" + value}/>
                </ActionPanel>
            }
        />
    );
}

