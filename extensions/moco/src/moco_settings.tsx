import {
  Alert,
  confirmAlert,
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { fetchProjects } from "./commands/projects/api";
import { Project } from "./commands/projects/types";
import {
  isAvailableTimerProject,
  JiraDefault,
  makeJiraDefault,
  makeTimerDefault,
  normalizeJiraScope,
  resolveJiraDefault,
  resolveTimerDefault,
  TimerDefault,
} from "./utils/jira-defaults";
import {
  listJiraDefaults,
  loadTimerDefault,
  removeJiraDefault,
  removeTimerDefault,
  saveJiraDefault,
  saveTimerDefault,
} from "./utils/jira-default-storage";
import { loadBrowserConfig, saveBrowserConfig } from "./utils/browser";
import { BROWSERS, BrowserConfig } from "./utils/browser-config";
import { MenuBarSettings } from "./commands/menu-bar/MenuBarSettings";

interface RuleValues {
  host: string;
  prefix: string;
  project: string;
  task: string;
}

function RuleForm({
  rule,
  defaults,
  general = false,
  projects,
  onSaved,
}: {
  rule?: JiraDefault;
  defaults?: TimerDefault;
  general?: boolean;
  projects: Project[];
  onSaved: () => void | Promise<unknown>;
}) {
  const { pop } = useNavigation();
  const initial = general
    ? resolveTimerDefault(defaults, projects)
    : rule
      ? resolveJiraDefault(rule, rule, projects)
      : undefined;
  const { handleSubmit, itemProps, values, setValue } = useForm<RuleValues>({
    initialValues: {
      host: rule?.host ?? "",
      prefix: rule?.prefix ?? "",
      project: initial?.projectId ?? "",
      task: initial?.taskId ?? "",
    },
    validation: {
      host:
        rule || general
          ? undefined
          : (value) => {
              try {
                normalizeJiraScope(value ?? "", "PROJ");
              } catch {
                return "Enter a Jira hostname, e.g. your-team.atlassian.net.";
              }
            },
      prefix:
        rule || general
          ? undefined
          : (value) => {
              try {
                normalizeJiraScope("example.atlassian.net", value ?? "");
              } catch {
                return "Enter the Jira project key, e.g. PROJ.";
              }
            },
      project: FormValidation.Required,
      task: FormValidation.Required,
    },
    onSubmit: async (values) => {
      try {
        if (general) await saveTimerDefault(makeTimerDefault(Number(values.project), Number(values.task), projects));
        else {
          const scope = rule ?? normalizeJiraScope(values.host, values.prefix);
          await saveJiraDefault(makeJiraDefault(scope, Number(values.project), Number(values.task), projects));
        }
        await showToast({ style: Toast.Style.Success, title: general ? "Timer defaults saved" : "Jira rule saved" });
        await onSaved();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Could not save defaults" });
      }
    },
  });
  const selectedProject = projects.find((p) => String(p.id) === values.project);
  useEffect(() => {
    if (values.task && !selectedProject?.tasks.some((t) => t.active !== false && String(t.id) === values.task))
      setValue("task", "");
  }, [selectedProject, values.task]);

  return (
    <Form
      navigationTitle={
        general ? "Default Project and Role" : rule ? `Edit ${rule.prefix}-* Defaults` : "New Jira Project Defaults"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Defaults" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {general ? null : rule ? (
        <Form.Description title="Jira Rule" text={`${rule.host} · ${rule.prefix}-*`} />
      ) : (
        <>
          <Form.TextField title="Jira Hostname" placeholder="your-team.atlassian.net" {...itemProps.host} />
          <Form.TextField title="Jira Project Key" placeholder="PROJ" {...itemProps.prefix} />
        </>
      )}
      {initial?.notice ? <Form.Description title="Saved Defaults" text={initial.notice} /> : null}
      <Form.Dropdown title="MOCO Project" {...itemProps.project}>
        <Form.Dropdown.Item title="Choose a MOCO project…" value="" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} title={`${p.customer?.name ?? "Other"} · ${p.name}`} value={String(p.id)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Role / Service" {...itemProps.task}>
        <Form.Dropdown.Item title="Choose a role / service…" value="" />
        {(selectedProject?.tasks ?? [])
          .filter((t) => t.active !== false)
          .map((t) => (
            <Form.Dropdown.Item key={t.id} title={t.name} value={String(t.id)} />
          ))}
      </Form.Dropdown>
      <Form.Description
        text={
          general
            ? "Used for plain timers and Jira tickets without a matching rule. Jira-specific rules take priority. Each timer opens for review."
            : "Applies to this Jira site and project key. Takes priority over your plain timer defaults. Each timer opens for review."
        }
      />
    </Form>
  );
}

function BrowserSettings({ config, onSaved }: { config: BrowserConfig; onSaved: () => void | Promise<unknown> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ autoDetectJira: boolean; browser: string; jiraDomains: string }>({
    initialValues: config,
    validation: {
      jiraDomains: (value) => {
        try {
          (value ?? "")
            .split(/[\s,;]+/)
            .filter(Boolean)
            .forEach((host) => normalizeJiraScope(host, "PROJ"));
        } catch {
          return "Use comma-separated Jira hostnames, without paths or ports.";
        }
      },
    },
    onSubmit: async (values) => {
      await saveBrowserConfig({
        version: 1,
        autoDetectJira: values.autoDetectJira,
        browser: values.browser,
        jiraDomains: values.jiraDomains
          .split(/[\s,;]+/)
          .filter(Boolean)
          .map((host) => normalizeJiraScope(host, "PROJ").host)
          .join(", "),
      });
      await showToast({ style: Toast.Style.Success, title: "Browser settings saved" });
      await onSaved();
      pop();
    },
  });
  return (
    <Form
      navigationTitle="Browser and Jira Detection"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        title="Jira"
        label="Automatically detect a Jira ticket when starting a timer"
        {...itemProps.autoDetectJira}
      />
      <Form.Dropdown title="Read Tab From" {...itemProps.browser}>
        <Form.Dropdown.Item title="Active browser (recommended)" value="frontmost" />
        {BROWSERS.map((browser) => (
          <Form.Dropdown.Item key={browser.id} title={browser.name} value={browser.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Jira Domains"
        placeholder="your-team.atlassian.net, jira.example.com"
        {...itemProps.jiraDomains}
      />
      <Form.Description text="Leave domains empty to allow Jira Cloud (*.atlassian.net). For self-hosted Jira, enter its hostname. Only the selected browser's current tab is read. Active browser uses the app you were in before opening Raycast; it does not search background browsers or other tabs. A fixed browser uses that browser's frontmost window." />
      <Form.Description text="Allow Raycast to control the browser under macOS Privacy & Security → Automation. No webpage-JavaScript permission is needed. Firefox automatic detection is not supported; plain timers still work." />
    </Form>
  );
}

async function loadSettings() {
  const [rules, projects, defaults, config] = await Promise.all([
    listJiraDefaults(),
    fetchProjects(),
    loadTimerDefault(),
    loadBrowserConfig(),
  ]);
  return { rules, projects: projects.filter(isAvailableTimerProject), defaults, config };
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(loadSettings);
  const add = data ? (
    <Action.Push
      title="Add Jira Project Defaults"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<RuleForm projects={data.projects} onSaved={revalidate} />}
    />
  ) : null;
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Find a setting or Jira rule…"
      actions={<ActionPanel>{add}</ActionPanel>}
    >
      {data ? (
        <List.Section title="Timer Defaults">
          <List.Item
            title="Default Project and Role"
            icon={Icon.Stopwatch}
            subtitle={
              data.defaults
                ? `${data.defaults.projectName} · ${data.defaults.taskName}`
                : "Choose once, reuse for plain timers"
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Timer Defaults"
                  icon={Icon.Pencil}
                  target={<RuleForm general defaults={data.defaults} projects={data.projects} onSaved={revalidate} />}
                />
                {data.defaults ? (
                  <Action
                    title="Clear Timer Defaults"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Clear Timer Defaults?",
                          message: "New plain timers will ask you to choose a project and role.",
                          primaryAction: { title: "Clear Defaults", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await removeTimerDefault();
                        revalidate();
                      }
                    }}
                  />
                ) : null}
              </ActionPanel>
            }
          />
          <List.Item
            title="Browser and Jira Detection"
            icon={Icon.Globe}
            subtitle={
              data.config.autoDetectJira
                ? data.config.browser === "frontmost"
                  ? "Active browser"
                  : BROWSERS.find((b) => b.id === data.config.browser)?.name
                : "Off"
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Browser Settings"
                  icon={Icon.Pencil}
                  target={<BrowserSettings config={data.config} onSaved={revalidate} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      <List.Section title="Jira Project Rules" subtitle="Override the default project and role">
        {data?.rules.map((rule) => (
          <List.Item
            key={`${rule.host}:${rule.prefix}`}
            icon={Icon.Pin}
            title={`${rule.prefix}-*`}
            subtitle={rule.host}
            accessories={[{ text: `${rule.projectName} · ${rule.taskName}` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Defaults"
                  icon={Icon.Pencil}
                  target={<RuleForm rule={rule} projects={data.projects} onSaved={revalidate} />}
                />
                {add}
                <Action
                  title="Remove Defaults"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: `Remove ${rule.prefix}-* Defaults?`,
                        message: `Tickets on ${rule.host} will use the general timer defaults.`,
                        primaryAction: { title: "Remove Defaults", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      await removeJiraDefault(rule);
                      revalidate();
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        {data ? (
          <List.Item
            title="Add Jira Rule…"
            subtitle="For example PROJ-* → project + role"
            icon={Icon.Plus}
            actions={<ActionPanel>{add}</ActionPanel>}
          />
        ) : null}
      </List.Section>
      <List.Section title="Extension">
        <List.Item
          title="MOCO Connection"
          subtitle="Instance and API key"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action title="Open Connection Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Menu Bar Options"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action.Push title="Edit Menu Bar Options" icon={Icon.Pencil} target={<MenuBarSettings />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
