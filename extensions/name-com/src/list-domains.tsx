import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { API_URL, headers, parseResponse } from "./api";
import { DNSRecord, Domain, type DomainDetails } from "./types";

export default function ListDomains() {
    const { isLoading, data } = useFetch(API_URL + "domains", {
        headers,
        parseResponse,
        mapResult(result: { domains?: Domain[] }) {
            return {
                data: result.domains ?? []
            }
        },
        initialData: []
    });

    return <List isLoading={isLoading} searchBarPlaceholder="Search domain names">
        {!data.length && !isLoading && <List.EmptyView title="You have no domains. Start your domain search." actions={<ActionPanel>
            <Action.OpenInBrowser icon={getFavicon("https://www.name.com/")} title="Search on Name.com" url="https://www.name.com/" />
        </ActionPanel>} />}
        {data.map(d => <List.Item key={d.domainName} icon={getFavicon(`https://${d.domainName}`)} title={d.domainName} accessories={[
            { icon: d.locked ? Icon.Lock : Icon.LockUnlocked, tooltip: d.locked ? "Locked" : "Unlocked" },
            {date: new Date(d.expireDate), tooltip: `Expires: ${d.expireDate}` }
        ]} actions={<ActionPanel>
            <Action.Push icon={Icon.Eye} title="View Details" target={<DomainDetails domainName={d.domainName} />} />
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.Push icon={Icon.Text} title="View DNS Records" target={<DNSRecords domainName={d.domainName} />} />
        </ActionPanel>} />)}
    </List>
}

function DomainDetails({domainName}: {domainName: string}) {
    const { isLoading, data } = useFetch<DomainDetails>(API_URL + "domains/" + domainName, {
        headers,
        parseResponse
    });
    
    const markdown = domainName + (!data ? "" : `\n\n ## Nameservers \n\n ${data.nameservers.join(`\n\n`)}`);
    
    return <Detail isLoading={isLoading} markdown={markdown} metadata={data && <Detail.Metadata>
        <Detail.Metadata.Label title="Locked" icon={data.locked ? Icon.Check : Icon.Xmark} />
        <Detail.Metadata.Label title="Autorenew" icon={data.locked ? Icon.Check : Icon.Xmark} />
        <Detail.Metadata.Label title="Renewal Price" text={data.renewalPrice.toString()} />
        <Detail.Metadata.Label title="Create Data" text={data.createDate} />
        <Detail.Metadata.Label title="Expire Data" text={data.expireDate} />
    </Detail.Metadata>} />
}

function DNSRecords({domainName}: {domainName: string}) {
    const { isLoading, data } = useFetch(API_URL + `domains/${domainName}/records`, {
        headers,
        parseResponse,
        mapResult(result: { records?: DNSRecord[] }) {
            return {
                data: result.records ?? []
            }
        },
        initialData: []
    });

    return <List isLoading={isLoading}>
        {data.map(record => <List.Item key={record.id} icon={Icon.Dot} title={record.host} subtitle={record.domainName} accessories={[
            { tag: record.type }
        ]} />)}
    </List>
}