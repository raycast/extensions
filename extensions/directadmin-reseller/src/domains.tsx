import { useEffect, useState } from "react";
import {  createDomain, createSubdomain, deleteSubdomain, getDomains, getSubdomains } from "./utils/api";
import { CreateNewDomainFormValues, CreateSubdomainFormValues, GetDomainsResponse, SuccessResponse } from "./types";
import { Action, ActionPanel, Alert, Color, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";

export default function Domains() {
    const { push } = useNavigation();

    const [isLoading, setIsLoading] = useState(true);
    const [domains, setDomains] = useState<string[]>();

    async function getFromApi() {
        setIsLoading(true);
        const response = await getDomains();
        
        if (response.error==="0") {
            const data = response as GetDomainsResponse;
            const { list } = data;
            setDomains(list);
            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Domains`);
        }
        setIsLoading(false);
    }

    useEffect(() => {
getFromApi();
    }, [])

    return <List isLoading={isLoading}>
        {domains && domains.map(domain => <List.Item key={domain} title={domain} icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })} actions={<ActionPanel>
            <Action title="Get Subdomains" icon={Icon.Globe} onAction={() => push(<GetSubdomains domain={domain} />)} />
            <ActionPanel.Section>
                <Action title="Create New Domain" icon={Icon.Plus} onAction={() => push(<CreateNewDomain onDomainCreated={getFromApi} />)} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
        {!isLoading && <List.Section title="Actions">
            <List.Item title="Create New Domain" icon={Icon.Plus} actions={<ActionPanel>
                <Action title="Create New Domain" icon={Icon.Plus} onAction={() => push(<CreateNewDomain onDomainCreated={getFromApi} />)} />
            </ActionPanel>} />
        </List.Section>}
    </List>
}

type CreateNewDomainProps = {
    onDomainCreated: () => void;
}
function CreateNewDomain({ onDomainCreated }: CreateNewDomainProps) {
    const { pop } = useNavigation();

    const { handleSubmit, itemProps } = useForm<CreateNewDomainFormValues>({
        async onSubmit(values) {
            const params = values;
            if (!values.ubandwidth) delete params.ubandwidth;
            if (!values.uquota) delete params.uquota;

            const ssl = params.ssl ? "ON" : "OFF";
            const cgi = params.cgi ? "ON" : "OFF";
            const php = params.php ? "ON" : "OFF";
            
            const response = await createDomain({ ...params, ssl, cgi, php, action: "create" });

            if (response.error==="0") {
                const data = response as SuccessResponse;
                await showToast(Toast.Style.Success, data.text, data.details);
                onDomainCreated();
                pop();
            }
        },
        validation: {
          domain: FormValidation.Required,
          bandwidth(value) {
              if (!itemProps.ubandwidth.value && !value)
                return "The item is required";
          },
          quota(value) {
              if (!itemProps.quota.value && !value)
                return "The item is required";
          },
        },
      });

    return <Form navigationTitle="Create New Domain" actions={<ActionPanel>
        <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
    </ActionPanel>}>
        <Form.TextField title="Domain" placeholder="example.com" {...itemProps.domain} />
        <Form.TextField title="Bandwidth (MB)" placeholder="1024" {...itemProps.bandwidth} />
        <Form.Checkbox label="Unlimited Bandwidth" {...itemProps.ubandwidth} />
        <Form.TextField title="Quota (MB)" placeholder="1024" {...itemProps.quota} />
        <Form.Checkbox label="Unlimited Quota" {...itemProps.uquota} />
        <Form.Separator />
        <Form.Checkbox label="SSL" {...itemProps.ssl} />
        <Form.Checkbox label="CGI" {...itemProps.cgi} />
        <Form.Checkbox label="PHP" {...itemProps.php} />
    </Form>
}

type GetSubdomainsProps = {
    domain: string;
}
function GetSubdomains({ domain }: GetSubdomainsProps) {
    const { push } = useNavigation();
    
    const [isLoading, setIsLoading] = useState(true);
    const [subdomains, setSubdomains] = useState<string[]>();

    async function getFromApi() {
        setIsLoading(true)
        const response = await getSubdomains(domain);
        if (response.error==="0") {
            // this endpoint returns nothing if no subdomains so we handle it
            const list = ("list" in response) ? response.list as string[] : [];
            setSubdomains(list);

            await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Subdomains`);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        getFromApi();
    }, [])

    async function confirmAndDeleteSubdomain(subdomain: string) {
        if (
            await confirmAlert({
                title: `Delete subdomain '${subdomain}'?`,
                message: "This action cannot be undone.",
                icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
                primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive }
            })
        ) {
            let removeContents = false;
            if (
                await confirmAlert({
                    title: "Remove directory and contents?",
                    icon: Icon.QuestionMark,
                    primaryAction: { title: "Yes" },
                    dismissAction: { title: "No" }
                })
            ) removeContents = true;

            const response = await deleteSubdomain({ action: "delete", domain, select0: subdomain, contents: removeContents ? "yes" : "no" })
            if (response.error==="0") {
                const data = response as SuccessResponse;
                await showToast(Toast.Style.Success, data.text, data.details);
                await getFromApi();
            }
        }
    }

    return <List navigationTitle="Get Subdomains" isLoading={isLoading}>
        {subdomains && subdomains.map(subdomain => <List.Item key={subdomain} title={subdomain} subtitle={`.${domain}`} icon={getFavicon(`https://${subdomain}.${domain}`, { fallback: Icon.Globe })} actions={<ActionPanel>
            <Action title="Delete Subdomain" icon={Icon.DeleteDocument} style={Action.Style.Destructive} onAction={() => confirmAndDeleteSubdomain(subdomain)} />
            <ActionPanel.Section>
                <Action title="Create Subdomain" icon={Icon.Plus} onAction={() => push(<CreateSubdomain domain={domain} onSubdomainCreated={getFromApi} />)} />
            </ActionPanel.Section>
        </ActionPanel>} />)}
        {!isLoading && <List.Section title="Actions">
            <List.Item title="Create New Subdomain" icon={Icon.Plus} actions={<ActionPanel>
                <Action title="Create New Subdomain" icon={Icon.Plus} onAction={() => push(<CreateSubdomain domain={domain} onSubdomainCreated={getFromApi} />)} />
            </ActionPanel>} />
        </List.Section>}
    </List>
}

type CreateSubdomainProps = {
    domain: string;
    onSubdomainCreated: () => void;
}
function CreateSubdomain({ domain, onSubdomainCreated }: CreateSubdomainProps) {
    const { pop } = useNavigation();

    const { handleSubmit, itemProps } = useForm<CreateSubdomainFormValues>({
        async onSubmit(values) {
            const { subdomain } = values;
            const response = await createSubdomain({ subdomain, domain, action: "create" });

            if (response.error==="0") {
                const data = response as SuccessResponse;
                await showToast(Toast.Style.Success, data.text, data.details);
                onSubdomainCreated();
                pop();
            }
        },
        validation: {
          subdomain: FormValidation.Required
        },
      });

    return <Form navigationTitle="Create Subdomain" actions={<ActionPanel>
        <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
    </ActionPanel>}>
        <Form.Description title="Domain" text={domain} />
        <Form.TextField title="Subdomain" placeholder="dash" {...itemProps.subdomain} />
        <Form.Description text={`${itemProps.subdomain.value}.${domain}`} />
    </Form>
}