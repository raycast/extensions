import { List, ActionPanel, Action, Icon, confirmAlert, Color, Alert, showToast, Toast, useNavigation, Form, Keyboard } from "@raycast/api";
import { useCachedPromise, useForm, FormValidation } from "@raycast/utils";
import { ApiSuccessResponse, Webhook, CreateWebhookInput, WebhookMessage } from "vartiq";
import { vartiq } from "./vartiq";
import { WebhookMessageAttempt } from "./types";

export default function Webhooks({appId,navigationTitle}: {appId: string;navigationTitle:string}) {
    const {isLoading, data:webhooks, error,mutate} = useCachedPromise(async() => {
        const data = await vartiq.webhook.list(appId) as unknown as ApiSuccessResponse<{webhooks: Webhook[]}>;
        return data.data.webhooks;
    },[], {
        initialData: []
    })

    return <List isLoading={isLoading} navigationTitle={navigationTitle}>
        {!isLoading && !webhooks.length && !error ? <List.EmptyView icon="folder-icon.svg" title="No webhook found" description="To get started sending webhooks to your destinations, create a webhook in your app" actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Create Webhook" target={<CreateWebhook appId={appId} navigationTitle={`${navigationTitle} / Create`} />} onPop={mutate} />
        </ActionPanel>} /> : webhooks.map(webhook => <List.Item key={webhook.id} icon="webhook.svg" title={webhook.url} subtitle={webhook.id} accessories={[
            {
                date: new Date(webhook.createdAt)
            }
        ]} actions={<ActionPanel>
            <Action.Push icon={Icon.LineChart} title="Webhook Messages" target={<WebhookMessages webhookId={webhook.id} navigationTitle={`... / ${webhook.name || webhook.id} / Messages`} />} />
            <Action.CopyToClipboard title="Copy ID to Clipboard" content={webhook.id} />
            <Action.Push shortcut={Keyboard.Shortcut.Common.New} icon={Icon.Plus} title="Create Webhook" target={<CreateWebhook appId={appId} navigationTitle={`${navigationTitle} / Create`} />} onPop={mutate} />
            <Action shortcut={Keyboard.Shortcut.Common.Remove} icon={Icon.Trash} title="Delete Webhook" onAction={() => confirmAlert({
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

function CreateWebhook({appId,navigationTitle}: {appId: string;navigationTitle:string}) {
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
    return <Form navigationTitle={navigationTitle} actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Plus} title="Create Webhook" onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="URL" placeholder="https://vartiq.com" {...itemProps.url} />
        <Form.TextField title="Name" {...itemProps.name} />
    </Form>
}

function WebhookMessages({webhookId,navigationTitle}:{webhookId: string,navigationTitle:string}) {
    const {isLoading,data:messages} = useCachedPromise(async() => {
        const data = await vartiq.request<ApiSuccessResponse<{webhookMessages: Array<WebhookMessage & {attempts: WebhookMessageAttempt[]}>}>>(`webhook-messages?webhookIds=${webhookId}`);
        return data.data.webhookMessages;
    },[],{initialData:[]})

    return <List isLoading={isLoading} navigationTitle={navigationTitle}>
        {messages.map(message => <List.Section key={message.id} title={message.payload} subtitle={`${message.attempts.length} attempts`}>
            {message.attempts.map(attempt => <List.Item key={attempt._id} title={attempt._id} accessories={[{tag: {value: attempt.statusCode.toString(), color: attempt.statusCode>=200 && attempt.statusCode<300 ? Color.Green:Color.Red}, tooltip: attempt.response},{date: new Date(attempt.createdAt)}]} />)}
        </List.Section>)}
    </List>
}