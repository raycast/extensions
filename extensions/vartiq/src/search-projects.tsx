import { FormValidation, useCachedPromise, useCachedState, useForm, usePromise } from "@raycast/utils";
import { vartiq } from "./vartiq";
import { Action, ActionPanel, Alert, Color, confirmAlert, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { CreateWebhookInput, Project } from "vartiq";

export default function SearchProjects() {
    const {isLoading, data: projects} = useCachedPromise(async() => {
        const data = await vartiq.project.list();
        return data.data as Array<Project & {appCount: number}>;
    }, [], {
        initialData: []
    })

    return <List isLoading={isLoading}>
{projects.map(project => <List.Item key={project.id} icon={Icon.Folder} title={project.name} subtitle={project.description ?? project.id} accessories={[
    {text: `Number of Apps: ${project.appCount}`}
]} actions={<ActionPanel>
    <Action.Push title="Apps" target={<Apps projectId={project.id} />} />
</ActionPanel>} />)}
    </List>
}

function Apps({projectId}: {projectId: string;}) {
    const {isLoading, data:apps=[]} = usePromise(async() => {
        const data = await vartiq.app.list(projectId);
        return data.data;
    })

    return <List isLoading={isLoading}>
        {apps.map(app => <List.Item key={app.id} id={app.id} icon={Icon.Layers} title={app.name} subtitle={app.id} accessories={[
            {date: new Date(app.createdAt)}
        ]} actions={<ActionPanel>
    <Action.Push title="Webhooks" target={<Webhooks appId={app.id} />} />
        </ActionPanel>} />)}
    </List>
}

function Webhooks({appId}: {appId: string;}) {
    const {isLoading, data:webhooks=[], error,mutate} = usePromise(async() => {
        const data = await vartiq.webhook.list(appId);
        return data.data;
    })

    return <List isLoading={isLoading}>
        {!isLoading && !webhooks.length && !error ? <List.EmptyView icon="folder-icon.svg" title="No webhook found" description="To get started sending webhooks to your destinations, create a webhook in your app" actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Create Webhook" target={<CreateWebhook appId={appId} />} onPop={mutate} />
        </ActionPanel>} /> : webhooks.map(webhook => <List.Item key={webhook.id} icon="webhook.svg" title={webhook.url} actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Create Webhook" target={<CreateWebhook appId={appId} />} onPop={mutate} />
            <Action icon={Icon.Trash} title="Delete Webhook" onAction={() => confirmAlert({
                icon: {source:Icon.Trash, tintColor: Color.Red},
                title: "Delete Webhoook",
                message: "Are you sure you want to delete this webhook? This action cannot be undone.",
                primaryAction: {
                    style: Alert.ActionStyle.Destructive,
                    title: "Delete",
                    async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", webhook.url);
            try {
                await mutate(
                    vartiq.webhook.delete(webhook.id), {
                        optimisticUpdate(data=[]) {
                            return data?.filter(w=>w.id!==webhook.id)
                        },
                        shouldRevalidateAfter: false
                    }
                )
                toast.style = Toast.Style.Success;
                toast.title = "Deleted";
            } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed";
                toast.message = `${error}`;
            }
                    },
                }
            })} style={Action.Style.Destructive} />
        </ActionPanel>} />)}
    </List>
}

function CreateWebhook({appId}: {appId: string;}) {
    const {pop} = useNavigation();

    const {handleSubmit,itemProps} = useForm<CreateWebhookInput>({
        async onSubmit(values) {
            const toast = await showToast(Toast.Style.Animated, "Creating", values.url);
            try {
                await vartiq.webhook.create({...values,
                    appId
                });
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
            url: FormValidation.Required
        }
    })
    return <Form actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Plus} title="Create Webhook" onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="URL" placeholder="https://vartiq.com" {...itemProps.url} />
        <Form.TextField title="Name" {...itemProps.name} />
    </Form>
}