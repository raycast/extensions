import {
  Action,
  ActionPanel,
  Alert,
  Application,
  Color,
  confirmAlert,
  Form,
  getApplications,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { useEffect, useMemo, useState } from "react";
import { getAppRule, isProtectedBundleId, loadAppRules, setAppRule } from "./lib/app-rules";
import {
  createCustomProcessRule,
  loadCustomProcessRules,
  removeCustomProcessRule,
  setCustomProcessRuleForceBehavior,
  upsertCustomProcessRule,
} from "./lib/custom-process-rules";
import { listRunningApplications, requestForceQuit, requestNormalQuit } from "./lib/macos-applications";
import {
  listRunningProcesses,
  matchCustomRulesToRunningTargets,
  requestProcessTermination,
} from "./lib/running-processes";
import type { AppRule, AppRulesState, CustomProcessRule } from "./types";

interface ConfigurableApplication extends Application {
  bundleId: string;
}

interface CustomProcessFormValues {
  behavior: "default" | "force";
  customPath: string;
  name: string;
  paths: string[];
}

export default function Command() {
  const [applications, setApplications] = useState<ConfigurableApplication[]>([]);
  const [appRules, setAppRules] = useState<AppRulesState>();
  const [customProcessRules, setCustomProcessRules] = useState<CustomProcessRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [installedApplications, loadedAppRules, loadedCustomProcessRules] = await Promise.all([
          getApplications(),
          loadAppRules(),
          loadCustomProcessRules(),
        ]);

        setApplications(prepareApplications(installedApplications));
        setAppRules(loadedAppRules);
        setCustomProcessRules(loadedCustomProcessRules);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Load Rules",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const appSections = useMemo(() => {
    if (!appRules) {
      return [];
    }

    return [
      {
        id: "protected",
        title: "Protected",
        subtitle: "Raycast is always kept open",
        applications: applications.filter((application) => isProtectedBundleId(application.bundleId)),
      },
      {
        id: "whitelist",
        title: "Whitelist",
        subtitle: "Never quit",
        applications: applications.filter(
          (application) =>
            !isProtectedBundleId(application.bundleId) && getAppRule(appRules, application.bundleId) === "whitelist",
        ),
      },
      {
        id: "force",
        title: "Automatic Force Quit",
        subtitle: "Force quit automatically if normal quit times out",
        applications: applications.filter((application) => getAppRule(appRules, application.bundleId) === "force"),
      },
      {
        id: "default",
        title: "Default",
        subtitle: "Ask before Force Quit if normal quit times out",
        applications: applications.filter(
          (application) =>
            !isProtectedBundleId(application.bundleId) && getAppRule(appRules, application.bundleId) === "default",
        ),
      },
    ];
  }, [applications, appRules]);

  async function changeAppRule(application: ConfigurableApplication, nextRule: AppRule) {
    try {
      const updatedRules = await setAppRule(application.bundleId, nextRule);
      setAppRules(updatedRules);
      await showToast({
        style: Toast.Style.Success,
        title: `${application.name}: ${ruleLabel(nextRule)}`,
      });
    } catch (error) {
      await showFailureToast("Could Not Update App Rule", error);
    }
  }

  async function addCustomProcessRule(rule: CustomProcessRule) {
    try {
      const updatedRules = await upsertCustomProcessRule(rule);
      setCustomProcessRules(updatedRules);
      await showToast({
        style: Toast.Style.Success,
        title: `${rule.name} Added`,
        message: rule.path,
      });
    } catch (error) {
      await showFailureToast("Could Not Add Process Path", error);
    }
  }

  async function changeCustomForceBehavior(rule: CustomProcessRule, forceAfterTimeout: boolean) {
    try {
      const updatedRules = await setCustomProcessRuleForceBehavior(rule.path, forceAfterTimeout);
      setCustomProcessRules(updatedRules);
      await showToast({
        style: Toast.Style.Success,
        title: `${rule.name}: ${forceAfterTimeout ? "automatic Force Quit" : "ask before Force Quit"}`,
      });
    } catch (error) {
      await showFailureToast("Could Not Update Process Rule", error);
    }
  }

  async function deleteCustomProcessRule(rule: CustomProcessRule) {
    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title: `Remove ${rule.name}?`,
      message: `QuitAll will no longer terminate processes at ${rule.path}.`,
      primaryAction: {
        title: "Remove Rule",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      const updatedRules = await removeCustomProcessRule(rule.path);
      setCustomProcessRules(updatedRules);
    } catch (error) {
      await showFailureToast("Could Not Remove Process Rule", error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search applications and process paths…">
      <List.Section
        title="Custom Process Paths"
        subtitle="Applications or executable files outside the standard app list"
      >
        {customProcessRules.map((rule) => (
          <List.Item
            key={rule.path}
            icon={{ fileIcon: rule.path }}
            title={rule.name}
            subtitle={rule.path}
            accessories={customProcessAccessories(rule)}
            actions={
              <CustomProcessActions
                rule={rule}
                onAdd={addCustomProcessRule}
                onChangeForceBehavior={changeCustomForceBehavior}
                onDelete={deleteCustomProcessRule}
              />
            }
          />
        ))}
      </List.Section>

      {appSections.map((section) => (
        <List.Section key={section.id} title={section.title} subtitle={section.subtitle}>
          {section.applications.map((application) => {
            const rule = appRules ? getAppRule(appRules, application.bundleId) : "default";
            const isProtected = isProtectedBundleId(application.bundleId);

            return (
              <List.Item
                key={application.bundleId}
                icon={{ fileIcon: application.path }}
                title={application.name}
                subtitle={application.bundleId}
                accessories={[appRuleAccessory(rule, isProtected)]}
                actions={
                  <AppRuleActions
                    application={application}
                    currentRule={rule}
                    isProtected={isProtected}
                    onAddCustomRule={addCustomProcessRule}
                    onChange={changeAppRule}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function AppRuleActions(props: {
  application: ConfigurableApplication;
  currentRule: AppRule;
  isProtected: boolean;
  onAddCustomRule: (rule: CustomProcessRule) => Promise<void>;
  onChange: (application: ConfigurableApplication, rule: AppRule) => Promise<void>;
}) {
  const { application, currentRule, isProtected, onAddCustomRule, onChange } = props;
  const primaryRule: AppRule = currentRule === "default" ? "whitelist" : "default";

  return (
    <ActionPanel>
      {!isProtected && (
        <>
          <Action
            title={actionTitle(primaryRule)}
            icon={ruleIcon(primaryRule)}
            onAction={() => onChange(application, primaryRule)}
          />
          {currentRule !== "whitelist" && primaryRule !== "whitelist" && (
            <Action
              title="Add to Whitelist"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={() => onChange(application, "whitelist")}
            />
          )}
          {currentRule !== "force" && (
            <Action
              title="Force Quit Automatically"
              icon={Icon.ExclamationMark}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={() => onChange(application, "force")}
            />
          )}
          {currentRule !== "default" && primaryRule !== "default" && (
            <Action
              title="Use Default Behavior"
              icon={Icon.ArrowCounterClockwise}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => onChange(application, "default")}
            />
          )}
        </>
      )}
      {isProtected && <Action title="Raycast Is Always Protected" icon={Icon.Lock} />}
      <AddCustomProcessPathAction onAdd={onAddCustomRule} />
    </ActionPanel>
  );
}

function CustomProcessActions(props: {
  rule: CustomProcessRule;
  onAdd: (rule: CustomProcessRule) => Promise<void>;
  onChangeForceBehavior: (rule: CustomProcessRule, forceAfterTimeout: boolean) => Promise<void>;
  onDelete: (rule: CustomProcessRule) => Promise<void>;
}) {
  const { rule, onAdd, onChangeForceBehavior, onDelete } = props;

  return (
    <ActionPanel>
      <Action
        title="Terminate Running Process…"
        icon={Icon.Stop}
        style={Action.Style.Destructive}
        onAction={() => terminateCustomPathNow(rule, false)}
      />
      <Action
        title="Force Quit Running Process…"
        icon={Icon.StopFilled}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => terminateCustomPathNow(rule, true)}
      />
      <Action
        title={rule.forceAfterTimeout ? "Ask Before Force Quit on Timeout" : "Force Quit Automatically on Timeout"}
        icon={rule.forceAfterTimeout ? Icon.QuestionMark : Icon.ExclamationMark}
        onAction={() => onChangeForceBehavior(rule, !rule.forceAfterTimeout)}
      />
      {existsSync(rule.path) && <Action.ShowInFinder path={rule.path} />}
      <Action
        title="Remove Process Rule…"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => onDelete(rule)}
      />
      <AddCustomProcessPathAction onAdd={onAdd} />
    </ActionPanel>
  );
}

function AddCustomProcessPathAction(props: { onAdd: (rule: CustomProcessRule) => Promise<void> }) {
  return (
    <Action.Push
      title="Add Custom Process Path…"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CustomProcessRuleForm onAdd={props.onAdd} />}
    />
  );
}

function CustomProcessRuleForm(props: { onAdd: (rule: CustomProcessRule) => Promise<void> }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: CustomProcessFormValues) {
    const [selectedPath] = values.paths;
    const path = values.customPath.trim() || selectedPath;

    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a File or Enter a Custom Path",
      });
      return;
    }

    try {
      const rule = await createCustomProcessRule({
        forceAfterTimeout: values.behavior === "force",
        name: values.name,
        path,
      });
      await props.onAdd(rule);
      pop();
    } catch (error) {
      await showFailureToast("Could Not Add Process Path", error);
    }
  }

  return (
    <Form
      navigationTitle="Add Custom Process Path"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Process Path" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="paths"
        title="Application or Executable"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles
      />
      <Form.TextField id="customPath" title="Custom Path" placeholder="Optional, for example ~/bin/worker" />
      <Form.TextField id="name" title="Display Name" placeholder="Optional; derived from the selected path" />
      <Form.Dropdown id="behavior" title="On Quit Timeout" defaultValue="default">
        <Form.Dropdown.Item value="default" title="Ask Before Force Quit" icon={Icon.QuestionMark} />
        <Form.Dropdown.Item value="force" title="Force Quit Automatically" icon={Icon.ExclamationMark} />
      </Form.Dropdown>
      <Form.Description text="Choose a file or enter an absolute path (~/ is supported). A custom path takes precedence over the picker. QuitAll targets every running process with the exact executable path." />
    </Form>
  );
}

async function terminateCustomPathNow(rule: CustomProcessRule, force: boolean) {
  try {
    const [applications, processes] = await Promise.all([listRunningApplications(), listRunningProcesses()]);
    const matches = matchCustomRulesToRunningTargets([rule], applications, processes);
    const matchedApplications = matches.applications.map((match) => match.application);
    const matchedProcesses = matches.processes.map((match) => match.process);
    const count = matchedApplications.length + matchedProcesses.length;

    if (count === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${rule.name} Is Not Running`,
        message: rule.path,
      });
      return;
    }

    const confirmed = await confirmAlert({
      icon: force ? Icon.StopFilled : Icon.Stop,
      title: `${force ? "Force Quit" : "Terminate"} ${rule.name}?`,
      message: `${formatCount(count, "process")} matched ${rule.path}. ${
        force ? "Unsaved data may be lost." : "A normal termination signal will be sent."
      }`,
      primaryAction: {
        title: force ? "Force Quit" : "Terminate",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const [applicationResults, processResults] = await Promise.all([
      force ? requestForceQuit(matchedApplications) : requestNormalQuit(matchedApplications),
      requestProcessTermination(matchedProcesses, force),
    ]);
    const acceptedCount = [...applicationResults, ...processResults].filter((result) => result.accepted).length;

    await showToast({
      style: acceptedCount > 0 ? Toast.Style.Success : Toast.Style.Failure,
      title:
        acceptedCount > 0 ? `${force ? "Force Quit" : "Termination"} Requested` : "Process Could Not Be Terminated",
      message: `${acceptedCount} of ${count} process requests accepted`,
    });
  } catch (error) {
    await showFailureToast("Could Not Terminate Process", error);
  }
}

function prepareApplications(applications: Application[]): ConfigurableApplication[] {
  const byBundleId = new Map<string, ConfigurableApplication>();

  for (const application of applications) {
    if (!application.bundleId || byBundleId.has(application.bundleId)) {
      continue;
    }

    byBundleId.set(application.bundleId, {
      ...application,
      bundleId: application.bundleId,
    });
  }

  return [...byBundleId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

function customProcessAccessories(rule: CustomProcessRule): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        color: rule.forceAfterTimeout ? Color.Red : Color.SecondaryText,
        value: rule.forceAfterTimeout ? "Auto Force" : "Ask",
      },
      icon: rule.forceAfterTimeout ? Icon.ExclamationMark : Icon.QuestionMark,
    },
  ];

  if (!existsSync(rule.path)) {
    accessories.unshift({
      tag: {
        color: Color.Red,
        value: "Missing",
      },
    });
  }

  return accessories;
}

function appRuleAccessory(rule: AppRule, isProtected: boolean): List.Item.Accessory {
  if (isProtected) {
    return {
      tag: {
        color: Color.SecondaryText,
        value: "Protected",
      },
      icon: Icon.Lock,
    };
  }

  if (rule === "whitelist") {
    return {
      tag: {
        color: Color.Green,
        value: "Whitelist",
      },
      icon: Icon.CheckCircle,
    };
  }

  if (rule === "force") {
    return {
      tag: {
        color: Color.Red,
        value: "Auto Force",
      },
      icon: Icon.ExclamationMark,
    };
  }

  return {
    tag: {
      color: Color.SecondaryText,
      value: "Ask",
    },
  };
}

function ruleLabel(rule: AppRule): string {
  switch (rule) {
    case "default":
      return "ask before Force Quit";
    case "force":
      return "automatic Force Quit";
    case "whitelist":
      return "whitelisted";
  }
}

function actionTitle(rule: AppRule): string {
  switch (rule) {
    case "default":
      return "Use Default Behavior";
    case "force":
      return "Force Quit Automatically";
    case "whitelist":
      return "Add to Whitelist";
  }
}

function ruleIcon(rule: AppRule): Icon {
  switch (rule) {
    case "default":
      return Icon.ArrowCounterClockwise;
    case "force":
      return Icon.ExclamationMark;
    case "whitelist":
      return Icon.CheckCircle;
  }
}

function formatCount(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

async function showFailureToast(title: string, error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
