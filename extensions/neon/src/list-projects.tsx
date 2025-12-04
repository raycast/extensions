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
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, MutatePromise, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { neon } from "./neon";
import { OpenInNeon } from "./components";
import { formatBytes, formatDate } from "./utils";
import { ListComputes } from "./views/computes";
import { RolesAndDatabases } from "./views/roles-and-databases";
import { ProjectListItem } from "@neondatabase/api-client";

export default function ListProjects() {
  const { isLoading, data, mutate, revalidate } = useCachedPromise(
    async () => {
      const res = await neon.listProjects({});
      return res.data.projects;
    },
    [],
    {
      initialData: [],
    },
  );

  const confirmAndDelete = async (project: ProjectListItem) => {
    const options: Alert.Options = {
      icon: { source: Icon.Warning, tintColor: Color.Red },
      title: `Permanently delete project "${project.name}"`,
      message: "This action is not reversible. Proceed with caution.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting", project.name);
      try {
        await mutate(neon.deleteProject(project.id), {
          optimisticUpdate(data) {
            return data.filter((p) => p.id !== project.id);
          },
          shouldRevalidateAfter: false,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    }
  };

  return (
    <List isLoading={isLoading}>
      {data.map((project) => (
        <List.Item
          key={project.id}
          icon={{ source: "project.svg", tintColor: Color.PrimaryText }}
          title={project.name}
          subtitle={project.region_id}
          accessories={[
            { icon: Icon.Coin, text: formatBytes(project.synthetic_storage_size), tooltip: "Storage" },
            { icon: `number-${project.pg_version}-16`, tooltip: "Postgres version" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={{ source: "branch.svg", tintColor: Color.PrimaryText }}
                title="View Project Branches"
                target={<ProjectBranches id={project.id} />}
              />
              <Action.Push
                icon={{ source: "monitoring.svg", tintColor: Color.PrimaryText }}
                title="Monitoring"
                target={<ProjectMonitoring project={project} />}
              />
              <Action.Push
                icon={Icon.Pencil}
                title="Update Project"
                target={<UpdateProject project={project} mutate={mutate} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
              <Action
                icon={Icon.Warning}
                title="Delete Project"
                onAction={() => confirmAndDelete(project)}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
              />
              <Action.Push
                icon={Icon.Plus}
                title="Create Project"
                target={<CreateProject onCreate={revalidate} />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
              <OpenInNeon route={`projects/${project.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ProjectBranches({ id }: { id: string }) {
  const { isLoading, data: branches = [] } = usePromise(async () => {
    const res = await neon.listProjectBranches({ projectId: id });
    return res.data.branches;
  });

  return (
    <List isLoading={isLoading}>
      {branches.map((branch) => {
        const accessories: List.Item.Accessory[] = [
          { icon: Icon.Coin, text: formatBytes(branch.logical_size), tooltip: "Data size" },
        ];
        if (branch.current_state === "ready")
          accessories.unshift({
            tag: "IDLE",
            tooltip: "Compute is suspended and automatically activates on client connections",
          });
        return (
          <List.Item
            key={branch.id}
            icon={{ source: "branch.svg", tintColor: Color.PrimaryText }}
            title={branch.name}
            subtitle={branch.default ? "DEFAULT" : ""}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Coin}
                  title="View Roles & Databases"
                  target={<RolesAndDatabases projectId={id} branchId={branch.id} />}
                />
                <Action.Push
                  icon={Icon.ComputerChip}
                  title="View Compute Endpoints"
                  target={<ListComputes projectId={id} branchId={branch.id} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ProjectMonitoring({ project }: { project: ProjectListItem }) {
  const { isLoading, data: operations } = usePromise(async () => {
    const res = await neon.listProjectOperations({ projectId: project.id });
    return res.data.operations;
  });
  return (
    <List isLoading={isLoading}>
      {operations?.map((operation) => (
        <List.Item
          key={operation.id}
          title={operation.action}
          subtitle={operation.endpoint_id}
          accessories={[
            { text: `Duration: ${operation.total_duration_ms} ms` },
            { date: new Date(operation.updated_at), tooltip: `Date: ${formatDate(operation.updated_at)}` },
          ]}
        />
      ))}
    </List>
  );
}

function UpdateProject({ project, mutate }: { project: ProjectListItem; mutate: MutatePromise<ProjectListItem[]> }) {
  const { pop } = useNavigation();
  type FormValues = {
    name: string;
    enable_logical_replication: boolean;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating project", project.name);
      try {
        await mutate(
          neon.updateProject(project.id, {
            project: {
              name: values.name,
              settings: {
                enable_logical_replication: values.enable_logical_replication,
              },
            },
          }),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Updated project";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Updating failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: project.name,
      enable_logical_replication: project.settings?.enable_logical_replication,
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Pencil} title="Update Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Project ID" text={project.id} />

      <Form.Separator />
      <Form.Description text="General" />
      <Form.TextField title="Project name" placeholder={project.name} {...itemProps.name} />

      <Form.Separator />
      <Form.Checkbox
        label="Logical Replication"
        info="Logical replication lets you replicate data changes from Neon to external data services and platforms."
        {...itemProps.enable_logical_replication}
      />
      <Form.Description
        title="⚠️"
        text="Enabling logical replication:
- Restarts all computes in your Neon project, dropping any active connections
- Changes your Postgres wal_level setting to logical
- Can not be turned off once enabled"
      />
    </Form>
  );
}

function CreateProject({ onCreate }: { onCreate: () => void }) {
  const { pop } = useNavigation();

  const { isLoading, data: regions } = useCachedPromise(
    async () => {
      const res = await neon.getActiveRegions();
      return res.data.regions;
    },
    [],
    {
      initialData: [],
    },
  );
  type FormValues = {
    name: string;
    pg_version: string;
    region_id: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating project", values.name);
      try {
        await neon.createProject({ project: { ...values, pg_version: +values.pg_version } });
        toast.style = Toast.Style.Success;
        toast.title = "Created project";
        onCreate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Creating failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      pg_version: "17",
      region_id: regions.find((region) => region.default)?.region_id,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Project name" placeholder="e.g., app name or customer name" {...itemProps.name} />
      <Form.Dropdown title="Postgres version" {...itemProps.pg_version}>
        <Form.Dropdown.Item title="14" value="14" />
        <Form.Dropdown.Item title="15" value="15" />
        <Form.Dropdown.Item title="16" value="16" />
        <Form.Dropdown.Item title="17" value="17" />
      </Form.Dropdown>
      <Form.Dropdown title="Region" {...itemProps.region_id}>
        <Form.Dropdown.Section title="AWS">
          {regions
            .filter((region) => region.region_id.startsWith("aws-"))
            .map((region) => (
              <Form.Dropdown.Item key={region.region_id} title={region.name} value={region.region_id} />
            ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Azure">
          {regions
            .filter((region) => region.region_id.startsWith("azure-"))
            .map((region) => (
              <Form.Dropdown.Item key={region.region_id} title={region.name} value={region.region_id} />
            ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}
