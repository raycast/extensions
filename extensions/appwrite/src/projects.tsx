import { FormValidation, useCachedPromise, useForm, useLocalStorage } from "@raycast/utils";
import { Action, ActionPanel, Alert, Color, confirmAlert, Form, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";
import { sdk } from "./sdk";

interface Project {
    name: string;
    id: string;
    endpoint: string;
    key: string;
}
export default function Projects() {
    const { isLoading, value: projects = [], setValue: setProjects } = useLocalStorage<Project[]>("projects");

    return <List isLoading={isLoading}>
        {!isLoading && !projects?.length ? <List.EmptyView icon="appwrite.png" title="Add a project" actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Project" target={<AddProject />} />
        </ActionPanel>} /> : projects.map(project => <List.Item key={project.id} icon="appwrite.png" title={project.name} subtitle={project.id} actions={<ActionPanel>
            <Action icon={Icon.Trash} title="Remove Project" onAction={() => confirmAlert({
                icon: { source: Icon.Trash, tintColor: Color.Red },
                title: `Remove "${project.name}"?`,
                message: "This will not remove the project from Appwrite",
                primaryAction: {
                    style: Alert.ActionStyle.Destructive,
                    title: "Remove",
                    async onAction() {
                        const updated = projects.filter(p => p.id!==project.id);
                        await setProjects(updated);
                        await showToast(Toast.Style.Failure, "Removed", project.name);
                        await popToRoot();
                    },
                }
            })} style={Action.Style.Destructive} />
            <Action.Push icon={Icon.Plus} title="Add Project" target={<AddProject />} />
        </ActionPanel>} />)}
    </List>
}

function AddProject() {
    const { value = [], setValue } = useLocalStorage<Project[]>("projects")
    const {itemProps, handleSubmit} = useForm<Project>({
        async onSubmit(values) {
            const toast = await showToast(Toast.Style.Animated, "Verifying", values.name);
            try {
                const client = new sdk.Client();
                client.setEndpoint(values.endpoint).setProject(values.id).setKey(values.key);
                const users = new sdk.Users(client);
                await users.list();
                toast.title = "Adding";
                
                const projects = [...value, values];
                await setValue(projects);
                toast.style = Toast.Style.Success;
                toast.title = "Added";
                await popToRoot();
            } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Could not add";
                toast.message = `${error}`;
                console.log(error)
            }
        },
        validation: {
            name: FormValidation.Required,
            id: FormValidation.Required,
            endpoint: FormValidation.Required,
            key: FormValidation.Required,
        }
    })
    return <Form actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Plus} title="Add" onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="Local Name" placeholder="Appwrite project" info="Assign a memorable name for local use" {...itemProps.name} />
        <Form.TextField title="Appwrite Endpoint" placeholder="https://fra.cloud.appwrite.io/v1" info="Enter the full endpoint with version" {...itemProps.endpoint} />
        <Form.TextField title="Project ID" placeholder="Enter ID" {...itemProps.id} />
        <Form.PasswordField title="API Key" placeholder="standard_XXX...XXX" {...itemProps.key} />
    </Form>
}