import { Action, ActionPanel, Alert, Color, Detail, Form, Icon, List, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { addWebDomain, deleteWebDomain, getUserIPs, getWebDomainAccesslog, getWebDomainErrorlog, getWebDomainSSL, getWebDomains, suspendWebDomain, suspendWebDomains, unsuspendWebDomain, unsuspendWebDomains } from "../utils/hestia";
import { AddWebDomainFormValues, ListWebDomainAccesslogResponse, ListWebDomainErrorlogResponse, ListWebDomainSSLResponse, ListWebDomainsResponse } from "../types/web-domains";
import ListItemDetailComponent from "./ListItemDetailComponent";
import { ListUserIPsResponse } from "../types";
import useHestia from "../utils/hooks/useHestia";

type ListWebDomainsComponentProps = {
    user: string;
}
export default function ListWebDomainsComponent({ user }: ListWebDomainsComponentProps) {
    const { isLoading, data: domains, revalidate } = getWebDomains(user);
    
    return <List isLoading={isLoading} isShowingDetail>
        {domains && Object.entries(domains).map(([domain, data]) => <List.Item key={domain} title={domain} icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })} detail={<ListItemDetailComponent data={data} />} accessories={[
            { icon: { source: Icon.Dot, tintColor: data.SUSPENDED==="yes" ? Color.Red : Color.Green } }
        ]} actions={<ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard as JSON" icon={Icon.Clipboard} content={JSON.stringify(data)} />
            <ActionPanel.Section>
                <ActionPanel.Submenu title="View Logs" icon={Icon.ArrowRight}>
                    <Action.Push title="View Access Log" icon={Icon.Eye} target={<ViewDomainAccessLog user={user} domain={domain} />} />
                    <Action.Push title="View Error Log" icon={Icon.ExclamationMark} target={<ViewDomainErrorLog user={user} domain={domain} />} />
                </ActionPanel.Submenu>
                <Action.Push title="View Domain SSL" icon={Icon.Lock} target={<ViewDomainSSL user={user} domain={domain} />} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
        {!isLoading && <List.Section title="Actions">
            <List.Item title="Add Web Domain" icon={Icon.Plus} actions={<ActionPanel>
                <Action.Push title="Add Web Domain" target={<AddWebDomain user={user} onWebDomainAdded={revalidate} />} />
            </ActionPanel>} />
        </List.Section>}
    </List>
}

type ViewDomainAccessLogProps = {
    user: string;
    domain: string;
}
export function ViewDomainAccessLog({ user, domain }: ViewDomainAccessLogProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [accesslog, setAccesslog] = useState<ListWebDomainAccesslogResponse>();

    useEffect(() => {
        const getFromApi = async () => {
            const response = await getWebDomainAccesslog(user, domain);
            if (!("error" in response)) {
                await showToast({
                    title: "SUCCESS",
                    message: `Fetched ${response.length} Accesslog lines`
                })
                setAccesslog(response);
            };  
            setIsLoading(false);
        }
        getFromApi();
    }, [])

    const markdown = !accesslog ? "" : accesslog.join(`\n\n`);

    return <Detail navigationTitle="View Access Log" isLoading={isLoading} markdown={markdown} actions={<ActionPanel>
        <Action.CopyToClipboard title="Copy to Clipboard" icon={Icon.Clipboard} content={JSON.stringify(accesslog)} />
    </ActionPanel>} />
}

type ViewDomainErrorLogProps = {
    user: string;
    domain: string;
}
export function ViewDomainErrorLog({ user, domain }: ViewDomainErrorLogProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [errorlog, setErrorlog] = useState<ListWebDomainErrorlogResponse>();

    useEffect(() => {
        const getFromApi = async () => {
            const response = await getWebDomainErrorlog(user, domain);
            if (!("error" in response)) {
                await showToast({
                    title: "SUCCESS",
                    message: `Fetched ${response.length} Error Log lines`
                })
                setErrorlog(response);
            };  
            setIsLoading(false);
        }
        getFromApi();
    }, [])

    const markdown = !errorlog ? "" : errorlog.join(`\n\n`);

    return <Detail navigationTitle="View Error Log" isLoading={isLoading} markdown={markdown} actions={<ActionPanel>
        <Action.CopyToClipboard title="Copy to Clipboard" icon={Icon.Clipboard} content={JSON.stringify(errorlog)} />
    </ActionPanel>} />
}

type ViewDomainSSLProps = {
    user: string;
    domain: string;
}
export function ViewDomainSSL({ user, domain }: ViewDomainSSLProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [ssl, setSSL] = useState<ListWebDomainSSLResponse>();

    useEffect(() => {
        const getFromApi = async () => {
            const response = await getWebDomainSSL(user, domain);
            if (!("error" in response)) {
                await showToast({
                    title: "SUCCESS",
                    message: `Fetched SSL`
                })
                setSSL(response)
            };
            setIsLoading(false);
        }
        getFromApi();
    }, [])

    const markdown = !ssl ? "" : `SSL Certificate

${ssl[domain].CRT}

SSL Private Key

${ssl[domain].KEY}

SSL Certificate Authority / Intermediate (Optional)

${ssl[domain].CA}`;

    return <Detail navigationTitle="View Domain SSL" isLoading={isLoading} markdown={markdown} metadata={ssl && <Detail.Metadata>
        <Detail.Metadata.Label title="Enable automatic HTTPS redirection" icon={ssl[domain].SSL_FORCE==="yes" ? Icon.Check : Icon.Multiply} />
        <Detail.Metadata.Label title="Issued To" text={ssl[domain].SUBJECT} />
        <Detail.Metadata.Label title="Alternate" text={ssl[domain].ALIASES} />
        <Detail.Metadata.Label title="Not Before" text={ssl[domain].NOT_BEFORE} />
        <Detail.Metadata.Label title="Not After" text={ssl[domain].NOT_AFTER} />
        <Detail.Metadata.Label title="Signature" text={ssl[domain].SIGNATURE} />
        <Detail.Metadata.Label title="Key Size" text={ssl[domain].PUB_KEY} />
        <Detail.Metadata.Label title="Issued By" text={ssl[domain].ISSUER} />
    </Detail.Metadata>} actions={<ActionPanel>
        <Action.CopyToClipboard title="Copy Certificate & Keys" content={markdown} icon={Icon.Clipboard} />
        <Action.CopyToClipboard title="Copy All to Clipboard as JSON" content={JSON.stringify(ssl)} icon={Icon.CopyClipboard} />
    </ActionPanel>} />
}

type AddWebDomainProps = {
    user: string;
    onWebDomainAdded: () => void;
}
function AddWebDomain({ user, onWebDomainAdded }: AddWebDomainProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [IPs, setIPs] = useState<ListUserIPsResponse>();

    useEffect(() => {
        const getIPsFromApi = async () => {
            const response = await getUserIPs(user);
            if (!("error" in response)) {
                await showToast({
                    title: "SUCCESS",
                    message: `Fetched User IPs`
                })
                setIPs(response);
            };  
            setIsLoading(false);
        }
        getIPsFromApi();
    }, [])

    const { handleSubmit, itemProps } = useForm<AddWebDomainFormValues>({
        async onSubmit(values) {
            setIsLoading(true);
            const response = await addWebDomain({...values, user});
            if (!("error" in response)) {
                await showToast({
                    title: "SUCCESS",
                    message: `Added ${values.domain}`
                });
                onWebDomainAdded();
            };
            setIsLoading(false);
        },
        validation: {
          domain: FormValidation.Required,
        },
    });

    return <Form navigationTitle="Add Web Domain" isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="Domain" placeholder="domain.example" {...itemProps.domain} />
        <Form.Dropdown title="IP Address" {...itemProps.ip}>
            {IPs && Object.keys(IPs).map(ip => <Form.Dropdown.Item key={ip} title={ip} value={ip} />)}
        </Form.Dropdown>
    </Form>
}