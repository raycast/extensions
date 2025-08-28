import { Action, ActionPanel, Alert, Color, confirmAlert, Form, getPreferenceValues, Icon, Image, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useFetch, useForm } from "@raycast/utils";

enum DomainStatus {
    PENDING="PENDING",
    ACTIVE="ACTIVE",
    ERROR="ERROR",
    DELETING="DELETING",
    DELETED="DELETED"
}
type Domain = {
    id: string;
    name: string;
    status: DomainStatus;
    updated_at: string;
}
type CreateDomain = {
    name: string;
    type: string;
    app_id: string;
}
type ErrorResult = {
    status: number;
    code: string;
    message: string;
    fields?: Array<{ field: string; description: string; }>
}

const { api_key } = getPreferenceValues<Preferences>();
const API_URL = "https://app.koyeb.com/v1/";
const headers = {
    Authorization: `Bearer ${api_key}`,
    "Content-Type": "application/json"
}
async function parseResponse(response: Response) {
    const result = await response.json();
    if (!response.ok) {
        const err = result as ErrorResult;
        if (err.fields?.length) throw new Error(`${err.fields[0].field} ${err.fields[0].description}`);
        throw new Error(err.message);
    }
    return result;
}

export default function ManageDomains() {
    const { isLoading, data: domains, error, revalidate, mutate } = useFetch(API_URL + "domains", {
        headers,
        parseResponse,
        mapResult(result: { domains: Domain[] }) {
            return {
                data: result.domains
            }
        },
        initialData: []
    });

    const DOMAIN_STATUS_ICON: Record<DomainStatus, Image.ImageLike> = {
        PENDING: {source: Icon.Hourglass, tintColor: Color.Yellow},
        ACTIVE: {source: Icon.Check, tintColor: Color.Green},
        ERROR: {source: Icon.Warning, tintColor: Color.Red},
        DELETING: Icon.Clock,
        DELETED: Icon.Trash,
    }

    async function confirmAndRemove(domain: Domain) {
        const options: Alert.Options = {
            title: `Remove "${domain.name}"?`,
            primaryAction: {
                style: Alert.ActionStyle.Destructive,
                title: "Remove"
            }
        }
        if (await confirmAlert(options)) {
            const toast = await showToast(Toast.Style.Animated, "Removing", domain.name);
            try {
                await mutate(
                    fetch(API_URL + `domains/${domain.id}`, {
                        method: "DELETE",
                        headers
                    }).then(parseResponse), {
                        optimisticUpdate(data) {
                            return data.map(d => d.id===domain.id ? ({...d, status: DomainStatus.DELETING}) : d)
                        },
                    }
                )
            } catch {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed";
                toast.message = `${error}`;
            }
        }
    }

    return <List isLoading={isLoading}>
        {!isLoading && !domains.length && !error ? <List.EmptyView title="You don't have any domains yet" description="Domains allow you to access your Apps using your own domains" actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Domain" target={<AddDomain />} onPop={revalidate} />
        </ActionPanel>} /> : domains.map(domain => <List.Item key={domain.id} icon={getFavicon(`https://${domain.name}`)} title={domain.name} accessories={[
            {icon: DOMAIN_STATUS_ICON[domain.status], tag: domain.status},
            {date: new Date(domain.updated_at)}
        ]} actions={<ActionPanel>
            <Action icon={Icon.Trash} title="Remove" onAction={() => confirmAndRemove(domain)} style={Action.Style.Destructive} />
            <Action.Push icon={Icon.Plus} title="Add Domain" target={<AddDomain />} onPop={revalidate} />
        </ActionPanel>} />)}
    </List>
}

function AddDomain() {
    const {pop} = useNavigation();
    const { isLoading, data: apps } = useFetch("https://app.koyeb.com/v1/apps", {
        headers: {
            Authorization: `Bearer ${api_key}`
        },
        mapResult(result: { apps: Array<{id: string; name: string;}> }) {
            return {
                data: result.apps
            }
        },
        initialData: []
    });

    const {handleSubmit, itemProps} = useForm<CreateDomain>({
        async onSubmit(values) {
            const toast = await showToast(Toast.Style.Animated, "Creating Domain", values.name);
            try {
                const response = await fetch(API_URL + "domains", {
                    method: "POST",
                    headers,
                    body: JSON.stringify(values)
                });
                await parseResponse(response);
                toast.style = Toast.Style.Success;
                toast.title = "Created";
                pop();
            } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed";
                toast.message = `${error}`;
            }
        },
        validation: {
            name: FormValidation.Required
        }
    });

    return <Form isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Plus} title="Add Domain" onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.Description text="Create a custom domain and assign it to one of your Koyeb app" />
        <Form.TextField title="Domain name" {...itemProps.name} />
        <Form.Dropdown title="Type" {...itemProps.type} info="AUTOASSIGNED: Domain like <appName>-<orgName>.koyeb.app">
            <Form.Dropdown.Item title="AUTOASSIGNED" value="AUTOASSIGNED" />
            <Form.Dropdown.Item title="CUSTOM" value="CUSTOM" />
        </Form.Dropdown>
        <Form.Dropdown title="Assign to Koyeb app" {...itemProps.app_id}>
            {apps.map(app => <Form.Dropdown.Item key={app.id} title={app.name} value={app.id} />)}
        </Form.Dropdown>
    </Form>
}