import { useEffect, useState } from "react";
import { ListMailDomainsResponse } from "../types";
import { getMailDomains } from "../api";
import { Action, ActionPanel, Color, Icon, List, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import ListItemDetailComponent from "./ListItemDetailComponent";

type ListMailDomainsComponentProps = {
    user: string;
}
export default function ListMailDomainsComponent({ user }: ListMailDomainsComponentProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [domains, setDomains] = useState<ListMailDomainsResponse>();

    const getFromApi = async () => {
        const response = await getMailDomains(user);
        if (!("error" in response)) {
            await showToast({
                title: "SUCCESS",
                message: `Fetched ${Object.keys(response).length} mail domains`
            })
            setDomains(response)
        };
        setIsLoading(false);
    }
    useEffect(() => {
        getFromApi();
    }, []);

    return <List isLoading={isLoading} isShowingDetail>
        {domains && Object.entries(domains).map(([domain, data]) => <List.Item key={domain} title={domain} icon={getFavicon(`${data.SSL==="yes" ? "https" : "http"}://${domain}`, { fallback: Icon.Globe })} detail={<ListItemDetailComponent data={data} />} accessories={[
            { icon: { source: Icon.Dot, tintColor: data.SUSPENDED==="yes" ? Color.Red : Color.Green } }
        ]} actions={<ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard as JSON" icon={Icon.Clipboard} content={JSON.stringify(data)} />
        </ActionPanel>} />)}
    </List>
}