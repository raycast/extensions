import { callWireguide } from "./call";

type ListItem = {
    name: string;
    active: boolean;
};

type StatusItem = {
    state: string;
    tunnel_name: string;
    interface_name: string;
    duration: string;
    rx_bytes: number;
    tx_bytes: number;
    endpoint: string;
    active_tunnels: string[];
};

type ListItemDto = {
    type: "list";
    name: string;
    isConnected: boolean;
};

type StatusItemDto = {
    type: "status";
    isConnected: true;
    name: string;
    duration: string;
    rx_bytes: number;
    tx_bytes: number;
    endpoint: string;
};

export async function listConnections(): Promise<Array<ListItemDto | StatusItemDto>> {
    const rawList = await callWireguide("list", "--json");
    const rawStatus = await callWireguide("status", "--json");

    const list = JSON.parse(rawList) as ListItem[];
    const status = JSON.parse(rawStatus) as StatusItem[];

    const result = list.map<ListItemDto | StatusItemDto>((item) => {
        const found = status.find((s) => s.tunnel_name === item.name);
        if (found !== undefined) {
            return {
                type: "status",
                name: found.tunnel_name,
                isConnected: true,
                duration: found.duration,
                rx_bytes: found.rx_bytes,
                tx_bytes: found.tx_bytes,
                endpoint: found.endpoint,
            };
        }

        return {
            type: "list",
            name: item.name,
            isConnected: item.active,
        };
    });

    return result;
}
