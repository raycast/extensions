import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { sdk, SDKProvider } from "./sdk";
import Databases from "./databases";
import Storage from "./storage";
import Users from "./users";
import Sites from "./sites";

export interface Project {
  name: string;
  id: string;
  endpoint: string;
  key: string;
}

export default function Projects() {
  const { isLoading, value: projects = [], setValue: setProjects } = useLocalStorage<Project[]>("projects");

  return (
    <List isLoading={isLoading}>
      {!isLoading && !projects?.length ? (
        <List.EmptyView
          icon="empty.svg"
          title="Add a project to get started"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Project" target={<AddProject />} />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            icon="appwrite.png"
            title={project.name}
            subtitle={project.id}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Build">
                  <Action.Push
                    icon={Icon.Coin}
                    title="Databases"
                    target={
                      <SDKProvider project={project}>
                        <Databases />
                      </SDKProvider>
                    }
                  />
                  <Action.Push
                    icon={Icon.Folder}
                    title="Storage"
                    target={
                      <SDKProvider project={project}>
                        <Storage />
                      </SDKProvider>
                    }
                  />
                  <Action.Push
                    icon={Icon.TwoPeople}
                    title="Users"
                    target={
                      <SDKProvider project={project}>
                        <Users />
                      </SDKProvider>
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Deploy">
                  <Action.Push
                    icon={Icon.Globe}
                    title="Sites"
                    target={
                      <SDKProvider project={project}>
                        <Sites />
                      </SDKProvider>
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add Project"
                    target={<AddProject />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Remove Project"
                    onAction={() =>
                      confirmAlert({
                        icon: { source: Icon.Trash, tintColor: Color.Red },
                        title: `Remove "${project.name}"?`,
                        message: "This will not remove the project from Appwrite",
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Remove",
                          async onAction() {
                            const updated = projects.filter((p) => p.id !== project.id);
                            await setProjects(updated);
                            await showToast(Toast.Style.Success, "Removed", project.name);
                            await popToRoot();
                          },
                        },
                      })
                    }
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddProject() {
  const { value = [], setValue } = useLocalStorage<Project[]>("projects");
  const { itemProps, handleSubmit } = useForm<Project>({
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
      }
    },
    validation: {
      name: FormValidation.Required,
      id: FormValidation.Required,
      endpoint: FormValidation.Required,
      key: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Local Name"
        placeholder="Appwrite project"
        info="Assign a memorable name for local use"
        {...itemProps.name}
      />
      <Form.TextField
        title="API Endpoint"
        placeholder="https://fra.cloud.appwrite.io/v1"
        info="Enter the full endpoint with version"
        {...itemProps.endpoint}
      />
      <Form.TextField title="Project ID" placeholder="Enter ID" {...itemProps.id} />
      <Form.PasswordField title="API Key" placeholder="standard_XXX...XXX" {...itemProps.key} />
    </Form>
  );
}
