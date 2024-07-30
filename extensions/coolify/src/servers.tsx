import { Action, ActionPanel, Form, Icon, List } from "@raycast/api";
import { type CreateServer, PrivateKey, Server } from "./lib/types";
import useCoolify from "./lib/use-coolify";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";

export default function Servers() {
    const { isLoading, data: servers = [] } = useCoolify<Server[]>("servers");

    return <List isLoading={isLoading}>
        {!isLoading && !servers.length && <List.EmptyView title="No servers found." description="Without a server, you won't be able to do much." actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Server" target={<CreateServer />} />
        </ActionPanel>} />}
        {servers.map(server => <List.Item key={server.id} title={server.name} />)}
    </List>
}

function CreateServer() {
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
        execute
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