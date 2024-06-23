import { Action, ActionPanel, Icon, List, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getUserPackages } from "./api";
import { useCachedState } from "@raycast/utils";
import ListItemDetailComponent from "./components/ListItemDetailComponent";
import { ListUserPackagesResponse } from "./types/packages";

export default function ListUserPackages() {
    const [isLoading, setIsLoading] = useState(true);
    const [userPackages, setUserPackages] = useCachedState<ListUserPackagesResponse>("packages");

    const getFromApi = async () => {
        const response = await getUserPackages();
        if (!("error" in response)) {
            await showToast({
                title: "SUCCESS",
                message: `Fetched ${Object.keys(response).length} user packages`
            })
            setUserPackages(response)
        };
        setIsLoading(false);
    }
    useEffect(() => {
        getFromApi();
    }, []);

    return <List isLoading={isLoading} isShowingDetail>
        {userPackages && Object.entries(userPackages).map(([userPackage, data]) => <List.Item key={userPackage} title={userPackage} icon={Icon.Box} accessories={[
            { date: new Date(`${data.DATE} ${data.TIME}`) }
        ]} detail={<ListItemDetailComponent data={data} />} actions={<ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard as JSON" icon={Icon.Clipboard} content={JSON.stringify(data)} />
        </ActionPanel>} />)}
    </List>
}