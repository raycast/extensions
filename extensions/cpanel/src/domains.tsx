import { List } from "@raycast/api";
import { AccountDomains } from "./lib/types";
import useUAPI from "./lib/useUAPI";
import { getFavicon } from "@raycast/utils";

export default function Domains() {
    const { isLoading, data } = useUAPI<AccountDomains>("DomainInfo", "list_domains");

    return <List isLoading={isLoading}>
        {data && <>
            <List.Section title="Main Domain">
                <List.Item title={data.main_domain} icon={getFavicon(`https://${data.main_domain}`)} />
            </List.Section>
        </>}
    </List>
}