import {Action, ActionPanel, Icon, List} from "@raycast/api";
import {useEffect, useState} from "react";
import {connectToPIA, disconnectFromPIA, getPIACurrentRegion, getPIARegions} from "./utils";
import {Region} from "./types";

export default function Command() {
    const [isLoading, setIsLoading] = useState(true);
    const [regions, setRegions] = useState<Region[]>([]);
    const [currentRegion, setCurrentRegion] = useState<string>();

    useEffect(() => {
        getPIARegions().then((regions) => {
            setRegions(regions);
            setIsLoading(false);
        });
    }, [])

    useEffect(() => {
        getPIACurrentRegion().then((region) => {
            setCurrentRegion(region);
        })
    }, [])

    return (

        <List
            isLoading={isLoading}
            searchBarPlaceholder="Search regions..."
        >
            {regions?.map((item: Region, index: number) => {
                const currentlyConnected = currentRegion === item.name;
                const connectedKeyword = currentlyConnected ? "Connected" : "";
                return (<List.Item
                    key={index}
                    title={item.title}
                    subtitle={item.name}
                    accessories={[{
                        icon: currentlyConnected ? Icon.Circle : undefined,
                        text: currentlyConnected ? "Connected" : undefined
                    }]}
                    keywords={[item.name, item.title, connectedKeyword]}
                    actions={<ActionPanel>
                        {!currentlyConnected && <Action
                            title="Connect"
                            shortcut={{modifiers: ["cmd"], key: "c"}}
                            onAction={async () => {
                                await connectToPIA(item.name);
                                setCurrentRegion(item.name);
                            }}
                        />}
                        {currentlyConnected && <Action
                            title="Disconnect"
                            shortcut={{modifiers: ["cmd"], key: "d"}}
                            onAction={async () => {
                                await disconnectFromPIA();
                                setCurrentRegion(undefined);
                            }}
                        />}
                        <Action.CopyToClipboard title="Copy Region Name" content={item.name}/>
                    </ActionPanel>}
                />)
            })}
        </List>
    );
}



