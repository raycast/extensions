import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import useVirtualizor from "./lib/hooks/useVirtualizor";
import { ListVirtualServersResponse, MessageResponse } from "./lib/types";
import { useState } from "react";

export default function VirtualServers() {
    const [action, setAction] = useState("");
    const [ID, setID] = useState<string | null>("");
    
    const { isLoading: isFetching, data, revalidate, BASE_URL } = useVirtualizor<ListVirtualServersResponse>("listvs");
    const { isLoading: isDoingAction } = useVirtualizor<MessageResponse>(action, {
        params: {
            svs: ID || "",
            do: "1"
        },
        execute: Boolean(action) && Boolean(ID),
        async onWillExecute() {
            await showToast(Toast.Style.Animated, action.at(0)?.toUpperCase() + action.slice(1) + `ing Server ${ID}`);
        },
        async onData(data) {
            await showToast(Toast.Style.Success, data.done.msg, data.output);
            setAction("");
            revalidate?.();
        },
        async onError() {
            setAction("");
        },
    })
    const isLoading = isFetching || isDoingAction;

    function getIcon(status: number) {
        let tintColor = undefined;
        switch (status) {
            case 0:
                tintColor = Color.Red;
                break;
            case 1:
                tintColor = Color.Green;
                break;
        
            default:
                break;
        }
        return { source: Icon.Dot, tintColor };
    }

    return <List isLoading={isLoading} onSelectionChange={setID}>
        {data && Object.values(data.vs).map(vps => <List.Item key={vps.vpsid} id={vps.vpsid} icon={getIcon(vps.status)} title={vps.hostname} subtitle={Object.values(vps.ips).join(", ")} accessories={[
            { icon: BASE_URL + vps.distro },
            { text: vps.email }
        ]} actions={!isLoading && <ActionPanel>
            <Action icon={Icon.Redo} title="Restart VPS" onAction={() => setAction("restart")} />
        </ActionPanel>} />)}
    </List>
}