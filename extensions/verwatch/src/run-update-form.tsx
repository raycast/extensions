import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getJson, Project, ProjectDetail, startUpdate } from "./api";

type Values = { merge_strategy: string; scope: string };

/**
 * Asks the two questions the project page asks before a run (how far to
 * carry it, which packages it may touch), then starts it. The merge
 * strategies come from the project, so one with no staging branch or with
 * unconfirmed branches only offers what VerWatch would accept.
 */
export function RunUpdateForm({ project }: { project: Project }) {
  const { pop } = useNavigation();
  const { data, isLoading } = useCachedPromise(
    (path: string, team: string) =>
      getJson<{ data: ProjectDetail }>(`projects/${path}`, { team }),
    [project.path, project.team.slug],
  );

  const strategies = data?.data.merge_strategies ?? [];
  const standing = strategies.find((strategy) => strategy.default);

  async function submit(values: Values) {
    const strategy = strategies.find((s) => s.value === values.merge_strategy);

    const confirmed = await confirmAlert({
      title: `Update ${project.name}?`,
      message: `${strategy?.label ?? values.merge_strategy}: ${strategy?.description ?? ""}`,
      primaryAction: {
        title: "Start Update",
        style:
          values.merge_strategy === "auto_merge_all"
            ? Alert.ActionStyle.Destructive
            : Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Starting update for ${project.name}`,
    });

    try {
      const started = await startUpdate(project, values);
      const count = started.expected_changes.length;

      toast.style = Toast.Style.Success;
      toast.title = `Update ${started.data.display_id} queued`;
      toast.message = `${count} package${count === 1 ? "" : "s"} to update`;
      toast.primaryAction = {
        title: "Open in VerWatch",
        onAction: () => open(started.data.url),
      };
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "VerWatch didn't start the update";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Run Update: ${project.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Update"
            icon={Icon.ArrowUpCircle}
            onSubmit={submit}
          />
          <Action.OpenInBrowser title="Open in VerWatch" url={project.url} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Project"
        text={`${project.name}: ${project.outdated_packages_count} outdated of ${project.packages_count} packages`}
      />
      {strategies.length > 0 && (
        <Form.Dropdown
          id="merge_strategy"
          title="When It's Done"
          defaultValue={standing?.value ?? strategies[0].value}
          info={standing ? `Scheduled runs use ${standing.label}.` : undefined}
        >
          {strategies.map((strategy) => (
            <Form.Dropdown.Item
              key={strategy.value}
              value={strategy.value}
              title={`${strategy.label}: ${strategy.description}`}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown id="scope" title="Packages" defaultValue="all">
        <Form.Dropdown.Item value="all" title="Everything outdated" />
        <Form.Dropdown.Item value="security" title="Security fixes only" />
      </Form.Dropdown>
    </Form>
  );
}
