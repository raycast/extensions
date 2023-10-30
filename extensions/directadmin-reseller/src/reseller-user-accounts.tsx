import { useEffect, useState } from "react";
import { getResellerUserAccounts, getUserConfig, getUserDomains, getUserUsage } from "./utils/api";
import { RESELLER_USERNAME } from "./utils/constants";
import { GetResellerUserAccountsResponse, GetUserConfigResponse, GetUserDomainsResponse, GetUserUsageResponse } from "./types";
import { Action, ActionPanel, Detail, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export default function GetAccounts() {
    const { push } = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<string[]>();

    async function getFromApi() {
        setIsLoading(true);
        const response = await getResellerUserAccounts(RESELLER_USERNAME);
        if (response.error==="0") {
            const data = response as GetResellerUserAccountsResponse;
            const { list } = data;
            setUsers(list);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Users`);
        }
        setIsLoading(false);
    }

    useEffect(() => {
getFromApi();
    }, [])

    return <List isLoading={isLoading}>
        {users && users.map(user => <List.Item key={user} title={user} icon={Icon.Person} actions={<ActionPanel>
            <Action title="See User Usage" icon={Icon.Network} onAction={() => push(<GetUserUsage user={user} />)} />
            <Action title="See User Config" icon={Icon.WrenchScrewdriver} onAction={() => push(<GetUserConfig user={user} />)} />
            <Action title="See User Domains" icon={Icon.Globe} onAction={() => push(<GetUserDomains user={user} />)} />
        </ActionPanel>} />)}
    </List>
}

type GetUserUsageProps = {
    user: string;
}
function GetUserUsage({ user }: GetUserUsageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [usage, setUsage] = useState<GetUserUsageResponse>();

    async function getFromApi() {
        setIsLoading(true)
        const response = await getUserUsage(user);
        if (response.error==="0") {
            const data = response as GetUserUsageResponse;
            setUsage(data);

            await showToast(Toast.Style.Success, "SUCCESS", "Fetched User Usage");
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    return <Detail navigationTitle="Get User Usage" isLoading={isLoading} markdown={`## User: ${user}`} metadata={!usage ? undefined : <Detail.Metadata>
        <Detail.Metadata.Label title="Bandwidth (MB)" text={usage.bandwidth || undefined} icon={usage.bandwidth ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Database Quote" text={usage.db_quota || undefined} icon={usage.db_quota ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Quota (MB)" text={usage.quota || undefined} icon={usage.quota ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Domain Pointers" text={usage.domainptr || undefined} icon={usage.domainptr ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Email Deliveries" text={usage.email_deliveries || undefined} icon={usage.email_deliveries ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Email Deliveries Incoming" text={usage.email_deliveries_incoming || undefined} icon={usage.email_deliveries_incoming ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Email Deliveries Outgoin" text={usage.email_deliveries_outgoing || undefined} icon={usage.email_deliveries_outgoing ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Email Quote" text={usage.email_quota || undefined} icon={usage.email_quota ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="FTP Accounts" text={usage.ftp || undefined} icon={usage.ftp ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Inode" text={usage.inode || undefined} icon={usage.inode ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="MySQL Databases" text={usage.mysql || undefined} icon={usage.mysql ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Email Forwarders" text={usage.nemailf || undefined} icon={usage.nemailf ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Email Mailing Lists" text={usage.nemailml || undefined} icon={usage.nemailml ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Email Autoresponders" text={usage.nemailr || undefined} icon={usage.nemailr ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Email POP Accounts" text={usage.nemails || undefined} icon={usage.nemails ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Subdomains" text={usage.nsubdomains || undefined} icon={usage.nsubdomains ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Other Quote" text={usage.other_quota || undefined} icon={usage.other_quota ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Quote Without System" text={usage.quota_without_system || undefined} icon={usage.quota_without_system ? undefined : Icon.Minus} />
        <Detail.Metadata.Label title="Virtual Domains" text={usage.vdomains || undefined} icon={usage.vdomains ? undefined : Icon.Minus} />
    </Detail.Metadata>} />
}

type GetUserConfigProps = {
    user: string;
}
function GetUserConfig({ user }: GetUserConfigProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<GetUserConfigResponse>();

    async function getFromApi() {
        setIsLoading(true)
        const response = await getUserConfig(user);
        if (response.error==="0") {
            const data = response as GetUserConfigResponse;
            setConfig(data);
            await showToast(Toast.Style.Success, "SUCCESS", "Fetched User Config");
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    return <Detail navigationTitle="Get User Config" isLoading={isLoading} markdown={`## User: ${user}`} metadata={!config ? undefined : <Detail.Metadata>
        {Object.entries(config).map(([key, val]) => <Detail.Metadata.Label key={key} title={key} text={val || undefined} icon={val ? undefined : Icon.Minus} />)}
    </Detail.Metadata>} actions={<ActionPanel><Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(config)} /></ActionPanel>} />
}

type GetUserDomainsProps = {
    user: string;
}
function GetUserDomains({ user }: GetUserDomainsProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [domains, setDomains] = useState<GetUserDomainsResponse>();

    async function getFromApi() {
        setIsLoading(true)
        const response = await getUserDomains(user);
        if (response.error==="0") {
            const data: GetUserDomainsResponse = {};
            Object.entries(response).map(([key, val]) => {
                const vals = val as string;
                const splitVals = vals.split(":");
                data[key] = {
                    bandwidth_used: splitVals[0],
                    bandwidth_limit: splitVals[1],
                    disk_usage: splitVals[2],
                    log_usage: splitVals[3],
                    subdomains: splitVals[4],
                    suspended: splitVals[5],
                    quote: splitVals[6],
                    ssl: splitVals[7],
                    cgi: splitVals[8],
                    php: splitVals[9],
                }
            })
            setDomains(data);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${Object.keys(data).length} Domains`);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    return <List navigationTitle="Get User Domains" isLoading={isLoading} isShowingDetail>
        {domains && Object.entries(domains).map(([domain, val]) => <List.Item key={domain} title={domain} icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
            {Object.entries(val).map(([k, v]) => <List.Item.Detail.Metadata.Label key={k} title={k} text={v} />)}
        </List.Item.Detail.Metadata>} />} />)}
    </List>
}