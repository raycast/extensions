import { FormValidation, useCachedPromise, useForm, useLocalStorage } from "@raycast/utils";
import {getSdks} from "./sdk";
import { Action, ActionPanel, Form, Grid, Icon, List, popToRoot, showToast, Toast } from "@raycast/api";

interface Project {
    name: string;
    id: string;
    endpoint: string;
    key: string;
}
export default function Projects() {
    const { isLoading, value: projects = [] } = useLocalStorage<Project[]>("projects");

    return <Grid isLoading={isLoading}>
        {!isLoading && !projects?.length ? <Grid.EmptyView actions={<ActionPanel>
            <Action.Push title="Add Project" target={<AddProject />} />
        </ActionPanel>} /> : projects.map(project => <Grid.Item key={project.id} title={project.name} content={project.id} />)}
    </Grid>
}

function AddProject() {
    const { value = [], setValue } = useLocalStorage<Project[]>("projects")
    const {itemProps, handleSubmit} = useForm<Project>({
        async onSubmit(values) {
            const toast = await showToast(Toast.Style.Animated, "Adding", values.name);
            const projects = [...value, values];
            await setValue(projects);
            toast.style = Toast.Style.Success;
            toast.title = "Added";
            await popToRoot();
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
        <Form.TextField title="Name" placeholder="Appwrite project" {...itemProps.name} />
        <Form.TextField title="ID" placeholder="Enter ID" {...itemProps.id} />
        <Form.TextField title="Endpoint" {...itemProps.endpoint} />
        <Form.TextField title="Key" {...itemProps.key} />
    </Form>
}