import { List } from "@raycast/api";
import useGet from "../hooks";
import { Server, ServerType } from "../types";
import PriceListItem from "./price-list-item";
import dayjs from "dayjs";
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export default function Servers() {
    const { isLoading, data: servers } = useGet<Server>("servers");

    return <List isLoading={isLoading} isShowingDetail>
        <List.Section title="Servers" subtitle={servers.length.toString()}>
            {servers.map(server => <List.Item key={server.id} title={server.hostname} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Hostname" text={server.hostname} />
                <List.Item.Detail.Metadata.Label title="Type" text={ServerType[server.server_type]} />
                <List.Item.Detail.Metadata.Label title="OS" text={server.os.name} />
                <List.Item.Detail.Metadata.Label title="Location" text={server.location.name} />
                <List.Item.Detail.Metadata.Label title="Provider" text={server.provider.name} />
                <PriceListItem price={server.price} />
                <List.Item.Detail.Metadata.Label title="Next due date" text={`${dayjs(server.price.next_due_date).fromNow(true)} from now`} />
                <List.Item.Detail.Metadata.Label title="CPU" text={server.cpu.toString()} />
                <List.Item.Detail.Metadata.Label title="RAM" text={`${server.ram} ${server.ram_type}`} />
                <List.Item.Detail.Metadata.Label title="Disk" text={`${server.disk} ${server.disk_type}`} />
                <List.Item.Detail.Metadata.Label title="Bandwidth" text={`${server.bandwidth} GB`} />
                <List.Item.Detail.Metadata.TagList title="IPv4">
                    {server.ips.filter(ip => ip.is_ipv4).map(ip => <List.Item.Detail.Metadata.TagList.Item key={ip.address} text={ip.address} />)}
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.TagList title="IPv6">
                    {server.ips.filter(ip => !ip.is_ipv4).map(ip => <List.Item.Detail.Metadata.TagList.Item key={ip.address} text={ip.address} />)}
                </List.Item.Detail.Metadata.TagList>
                <List.Item.Detail.Metadata.Label title="Was promo" text={server.was_promo===0 ? "No" : "Yes"} />
                <List.Item.Detail.Metadata.Label title="Owned since" text={server.owned_since} />
            </List.Item.Detail.Metadata>} />} />)}
        </List.Section>
    </List>
}