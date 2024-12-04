import { Icon, LaunchProps, List } from "@raycast/api";
import useGet from "./hooks";
import { Reseller, Shared } from "./types";
import { useState } from "react";
import HostingItem from "./components/hosting-item";

export default function Hosting(props: LaunchProps<{arguments: Arguments.Hosting }>) {
    const { hosting_type="reseller" } = props.arguments;
    const [type, setType] = useState(String(hosting_type));

    const { isLoading: isLoadingReseller, data: resellers } = useGet<Reseller>("reseller", {
        execute: type==="reseller"
    });
    const { isLoading: isLoadingShared, data: shared } = useGet<Shared>("shared", {
        execute: type==="shared"
    });

    return <List isLoading={isLoadingReseller || isLoadingShared} isShowingDetail searchBarAccessory={<List.Dropdown tooltip="Hosting Type" onChange={setType}>
        <List.Dropdown.Item icon={Icon.TwoPeople} title="Reseller" value="reseller" />
        <List.Dropdown.Item icon={Icon.Person} title="Shared" value="shared" />
    </List.Dropdown>}>
    {type==="reseller" && <List.Section title="Resellers" subtitle={resellers.length.toString()}>
    {resellers.map(reseller => <HostingItem key={reseller.id} host={reseller} />)}
    </List.Section>}
    {type==="shared" && <List.Section title="Shared" subtitle={shared.length.toString()}>
    {shared.map(item => <HostingItem key={item.id} host={item} />)}
    </List.Section>}
  </List>
}