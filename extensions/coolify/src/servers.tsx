import { Action, ActionPanel, Color, Detail, Form, Icon, Keyboard, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { type CreateServer, PrivateKey, Resource, Server, type ServerDetails } from "./lib/types";
import useCoolify from "./lib/use-coolify";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { getResourceColor, isValidCoolifyUrl } from "./lib/utils";

export default function Servers() {
    if (!isValidCoolifyUrl()) return <Detail markdown={`# ERROR \n\n Please make sure Coolify URL is valid`} actions={<ActionPanel>
        <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
    </ActionPanel>} />

    const { isLoading, data: servers = [], revalidate } = useCoolify<Server[]>("servers");

    function getServerColor(server: Server) {
        if (server.is_reachable && server.is_usable) return Color.Green;
        if (server.is_usable || server.is_usable) return Color.Yellow;
        return Color.Red;
    }

    return <List isLoading={isLoading} searchBarPlaceholder="Search server">
        {(!isLoading && !servers.length) ? <List.EmptyView title="No servers found." description="Without a server, you won't be able to do much." actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Server" target={<CreateServer onAdded={revalidate} />} />
        </ActionPanel>} /> : servers.map(server => <List.Item key={server.uuid} icon={{ source: Icon.HardDrive, tintColor: getServerColor(server) }} title={server.name} subtitle={server.description || ""} accessories={[{ text: server.ip }]} actions={<ActionPanel>
            <Action.Push icon={Icon.Eye} title="View Details" target={<ServerDetails server={server} />} />
            <Action.Push icon={Icon.CircleFilled} title="View Resources" target={<ViewResources server={server} />} />
            <Action.Push icon={Icon.Plus} title="Add Server" target={<CreateServer onAdded={revalidate} />} shortcut={Keyboard.Shortcut.Common.New} />
        </ActionPanel>} />)}
    </List>
}

function CreateServer({ onAdded }: { onAdded: () => void }) {
    const { pop } = useNavigation();
    const [execute, setExecute] = useState(false);
    const { isLoading: isFetchingKeys, data: keys = [] } = useCoolify<PrivateKey[]>("security/keys");

    const { itemProps, handleSubmit, values } = useForm<CreateServer>({
        onSubmit() {
            setExecute(true);
        },
        initialValues: {
            port: "22"
        },
        validation: {
            name: FormValidation.Required,
            ip: FormValidation.Required,
            port(value) {
                if (!value) return "The item is required";
                if (!Number(value)) return "The item must be a number";
            },
            user: FormValidation.Required,
            private_key_uuid: FormValidation.Required,
        }
    });

    const { isLoading: isCreating } = useCoolify("servers", {
        method: "POST",
        body: values,
        execute,
        onData() {
            onAdded();
            pop();
        },
        onError() {
            setExecute(false);
        },
    })

    const isLoading = isFetchingKeys || isCreating;

    return <Form isLoading={isLoading} actions={<ActionPanel>
            <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
    </ActionPanel>}>
    <Form.Description text="Create Server" />
        <Form.TextField title="Name" placeholder="correct-horse-battery-staple" {...itemProps.name} />
        <Form.TextField title="Description" placeholder="Comics Server" {...itemProps.description} />
        <Form.TextField title="IP Address / Domain" placeholder="example.com" info="An IP Address (127.0.0.1) or domain (example.com)" {...itemProps.ip} />
        <Form.TextField title="Port" placeholder="22" {...itemProps.port} />
        <Form.TextField title="User" placeholder="root" info="Non-root user is experimental" {...itemProps.user} />
        <Form.Dropdown title="Private Key" {...itemProps.private_key_uuid}>
            {keys.map(key => <Form.Dropdown.Item key={key.id} title={key.name} value={key.uuid} />)}
        </Form.Dropdown>
        <Form.Checkbox label="Use it as a build server?" {...itemProps.is_build_server} />
    </Form>
}

function ServerDetails({ server }: { server: Server }) {
    const { isLoading, data } = useCoolify<ServerDetails>(`servers/${server.uuid}`);

    return <Detail isLoading={isLoading} markdown={`# Servers / ${server.name} \n\n \`\`\`json\n${JSON.stringify(data, null, 4)}`} />
}

function ViewResources({ server }: { server: Server }) {
    const { isLoading, data: resources = [] } = useCoolify<Resource[]>(`servers/${server.uuid}/resources`);

    return <List isLoading={isLoading} searchBarPlaceholder="Search resource">
        {resources.map(resource => <List.Item key={resource.uuid} icon={{ source: Icon.CircleFilled, tintColor: getResourceColor(resource) }} title={resource.name} subtitle={resource.type} accessories={[
            { icon: resource.status.includes("unhealthy") ? { source: Icon.Warning, tintColor: Color.Yellow } : undefined },
            { text: resource.status },
            { date: new Date(resource.created_at) }
        ]} />)}
    </List>
}