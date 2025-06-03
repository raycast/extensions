import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  Detail,
  Color,
  useNavigation,
  Form,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import { showFailureToast } from "@raycast/utils";

const execPromise = promisify(exec);

interface BucketLifecycleViewProps {
  projectId: string;
  gcloudPath: string;
  bucketName: string;
}

interface LifecycleRule {
  id: string;
  action: {
    type: string;
    storageClass?: string;
  };
  condition: {
    age?: number;
    createdBefore?: string;
    customTimeBefore?: string;
    daysSinceCustomTime?: number;
    daysSinceNoncurrentTime?: number;
    isLive?: boolean;
    matchesPrefix?: string[];
    matchesStorageClass?: string[];
    matchesSuffix?: string[];
    noncurrentTimeBefore?: string;
    numNewerVersions?: number;
  };
}

interface CommandOptions {
  projectId?: string;
  formatJson?: boolean;
  quiet?: boolean;
  retries?: number;
}

interface FormValues {
  id: string;
  action: string;
  storageClass: string;
  age?: string;
  createdBefore?: string;
  isLive?: boolean;
  numNewerVersions?: string;
}

export default function BucketLifecycleView({ projectId, gcloudPath, bucketName }: BucketLifecycleViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [lifecycleRules, setLifecycleRules] = useState<LifecycleRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push, pop } = useNavigation();

  const cache = useRef<Map<string, unknown>>(new Map());

  function invalidateCache(pattern: RegExp) {
    for (const key of Array.from(cache.current.keys())) {
      if (pattern.test(key)) {
        cache.current.delete(key);
      }
    }
  }

  async function executeCommand(gcloudPath: string, command: string, options: CommandOptions = {}) {
    const { projectId, formatJson = true, quiet = false, retries = 0 } = options;

    const projectFlag = projectId ? ` --project=${projectId}` : "";
    const formatFlag = formatJson ? " --format=json" : "";
    const quietFlag = quiet ? " --quiet" : "";

    const fullCommand = `${gcloudPath} ${command}${projectFlag}${formatFlag}${quietFlag}`;

    const cacheKey = fullCommand;
    if (cache.current.has(cacheKey)) {
      return cache.current.get(cacheKey);
    }

    try {
      const { stdout, stderr } = await execPromise(fullCommand);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      if (!formatJson) {
        return stdout;
      }

      if (!stdout || stdout.trim() === "") {
        return [];
      }

      const result = JSON.parse(stdout);

      cache.current.set(cacheKey, result);

      return result;
    } catch (error) {
      if (retries > 0) {
        return executeCommand(gcloudPath, command, {
          projectId,
          formatJson,
          quiet,
          retries: retries - 1,
        });
      }
      throw error;
    }
  }

  const fetchLifecycleRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading lifecycle rules...",
      message: `Bucket: ${bucketName}`,
    });

    try {
      const result = await executeCommand(gcloudPath, `storage buckets describe gs://${bucketName} --format=json`, {
        retries: 1,
      });

      if (!result || !result.lifecycle || !result.lifecycle.rule) {
        setLifecycleRules([]);
        loadingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "No lifecycle rules found",
          message: `Bucket "${bucketName}" has no lifecycle rules configured`,
        });
        setIsLoading(false);
        return;
      }

      const rules = Array.isArray(result.lifecycle.rule) ? result.lifecycle.rule : [result.lifecycle.rule];

      const rulesWithIds = rules.map((rule: LifecycleRule, index: number) => {
        return {
          ...rule,
          id: rule.id || `rule-${index + 1}`,
        };
      });

      setLifecycleRules(rulesWithIds);

      loadingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Lifecycle rules loaded",
        message: `Found ${rulesWithIds.length} rules`,
      });
    } catch (error) {
      loadingToast.hide();
      console.error("Error fetching lifecycle rules:", error);

      let errorMessage = String(error);
      let errorTitle = "Failed to load lifecycle rules";

      if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = `You don't have permission to view lifecycle rules for "${bucketName}".`;
      } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        errorTitle = "Bucket not found";
        errorMessage = `The bucket "${bucketName}" was not found. It may have been deleted.`;
      }

      setError(`${errorTitle}: ${errorMessage}`);
      showFailureToast({ title: errorTitle, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, gcloudPath, bucketName]);

  useEffect(() => {
    fetchLifecycleRules();
  }, [fetchLifecycleRules]);

  async function deleteRule(ruleId: string) {
    const options = {
      title: "Delete Lifecycle Rule",
      message: `Are you sure you want to delete the rule "${ruleId}"?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const deletingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting lifecycle rule...",
        message: `Rule: ${ruleId}`,
      });

      try {
        const currentRules = [...lifecycleRules];

        const updatedRules = currentRules.filter((rule) => rule.id !== ruleId);

        const tempFilePath = `${os.tmpdir()}/lifecycle-${bucketName}-${Date.now()}.json`;

        const lifecycleConfig = {
          lifecycle: {
            rule: updatedRules,
          },
        };

        fs.writeFileSync(tempFilePath, JSON.stringify(lifecycleConfig, null, 2));

        await executeCommand(gcloudPath, `storage buckets update gs://${bucketName} --lifecycle-file=${tempFilePath}`, {
          quiet: true,
        });

        fs.unlinkSync(tempFilePath);

        deletingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Lifecycle rule deleted successfully",
          message: `Rule "${ruleId}" deleted`,
        });

        invalidateCache(new RegExp(`gs://${bucketName}`));

        fetchLifecycleRules();
      } catch (error) {
        deletingToast.hide();
        console.error("Error deleting lifecycle rule:", error);

        let errorMessage = String(error);
        let errorTitle = "Failed to delete lifecycle rule";

        if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
          errorTitle = "Permission denied";
          errorMessage = "You don't have permission to modify this bucket's lifecycle configuration.";
        }

        showFailureToast({ title: errorTitle, message: errorMessage });
      }
    }
  }

  function addNewRule() {
    push(
      <Form
        navigationTitle="Add Lifecycle Rule"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add Rule"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onSubmit={createRule}
            />
            <Action
              title="Cancel"
              icon={Icon.XmarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => pop()}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="id"
          title="Rule ID"
          placeholder="my-lifecycle-rule"
          info="A unique identifier for this rule"
          autoFocus
        />
        <Form.Dropdown id="action" title="Action" defaultValue="Delete" info="What to do when the condition is met">
          <Form.Dropdown.Item value="Delete" title="Delete" icon={Icon.Trash} />
          <Form.Dropdown.Item value="SetStorageClass" title="Change Storage Class" icon={Icon.HardDrive} />
        </Form.Dropdown>
        <Form.Dropdown
          id="storageClass"
          title="Storage Class"
          defaultValue="NEARLINE"
          info="Only applicable for SetStorageClass action"
        >
          <Form.Dropdown.Item value="NEARLINE" title="Nearline" icon={Icon.Clock} />
          <Form.Dropdown.Item value="COLDLINE" title="Coldline" icon={Icon.Snowflake} />
          <Form.Dropdown.Item value="ARCHIVE" title="Archive" icon={Icon.Box} />
          <Form.Dropdown.Item value="STANDARD" title="Standard" icon={Icon.HardDrive} />
        </Form.Dropdown>
        <Form.Separator />
        <Form.Description title="Condition" text="At least one condition must be specified" />
        <Form.TextField
          id="age"
          title="Age (days)"
          placeholder="30"
          info="Number of days since object creation (must be a positive number)"
        />
        <Form.TextField
          id="createdBefore"
          title="Created Before"
          placeholder="2023-01-01"
          info="Objects created before this date (YYYY-MM-DD)"
        />
        <Form.Checkbox
          id="isLive"
          label="Apply to live objects only"
          defaultValue={true}
          info="If checked, only applies to live objects (not archived/deleted)"
        />
        <Form.TextField
          id="numNewerVersions"
          title="Number of Newer Versions"
          placeholder="3"
          info="Apply when this many newer versions exist"
        />
        <Form.Description
          title="Best Practices"
          text={`• Use age-based conditions for predictable lifecycle management
• Combine multiple rules for complex scenarios
• Test with a small subset of objects first
• Consider cost implications of storage class transitions`}
        />
      </Form>,
    );
  }

  async function createRule(formValues: FormValues) {
    const creatingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating lifecycle rule...",
      message: `Rule: ${formValues.id}`,
    });

    try {
      if (formValues.age) {
        const age = parseInt(formValues.age);
        if (isNaN(age) || age <= 0) {
          throw new Error("Age must be a positive number");
        }
      }

      if (formValues.createdBefore) {
        const dateRegex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
        if (!dateRegex.test(formValues.createdBefore)) {
          throw new Error("Created Before date must be in YYYY-MM-DD format");
        }

        const date = new Date(formValues.createdBefore);
        if (isNaN(date.getTime())) {
          throw new Error("Created Before must be a valid date");
        }
      }

      const rule: LifecycleRule = {
        id: formValues.id || `rule-${Date.now()}`,
        action: {
          type: formValues.action,
        },
        condition: {},
      };

      if (formValues.action === "SetStorageClass") {
        rule.action.storageClass = formValues.storageClass;
      }

      if (formValues.age) {
        rule.condition.age = parseInt(formValues.age);
      }

      if (formValues.createdBefore) {
        rule.condition.createdBefore = formValues.createdBefore;
      }

      if (formValues.isLive !== undefined) {
        rule.condition.isLive = formValues.isLive;
      }

      if (formValues.numNewerVersions) {
        rule.condition.numNewerVersions = parseInt(formValues.numNewerVersions);
      }

      const currentRules = [...lifecycleRules];

      const updatedRules = [...currentRules, rule];

      const tempFilePath = `${os.tmpdir()}/lifecycle-${bucketName}-${Date.now()}.json`;

      const lifecycleConfig = {
        lifecycle: {
          rule: updatedRules,
        },
      };

      fs.writeFileSync(tempFilePath, JSON.stringify(lifecycleConfig, null, 2));

      await executeCommand(gcloudPath, `storage buckets update gs://${bucketName} --lifecycle-file=${tempFilePath}`, {
        quiet: true,
      });

      fs.unlinkSync(tempFilePath);

      creatingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Lifecycle rule created successfully",
        message: `Rule "${rule.id}" added`,
      });

      invalidateCache(new RegExp(`gs://${bucketName}`));

      pop();
      fetchLifecycleRules();
    } catch (error) {
      creatingToast.hide();
      console.error("Error creating lifecycle rule:", error);

      let errorMessage = String(error);
      let errorTitle = "Failed to create lifecycle rule";

      if (errorMessage.includes("Permission denied") || errorMessage.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = "You don't have permission to modify this bucket's lifecycle configuration.";
      }

      showFailureToast({ title: errorTitle, message: errorMessage });
    }
  }

  function viewRuleDetails(rule: LifecycleRule) {
    const conditionEntries = Object.entries(rule.condition)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `**${formatConditionKey(key)}:** ${value.join(", ")}`;
        }

        if (typeof value === "boolean") {
          return `**${formatConditionKey(key)}:** ${value ? "Yes" : "No"}`;
        }

        return `**${formatConditionKey(key)}:** ${value}`;
      });

    const conditionText = conditionEntries.length > 0 ? conditionEntries.join("\n\n") : "No conditions specified";

    const detailsMarkdown =
      `# Lifecycle Rule: ${rule.id}\n\n` +
      `## Action\n\n` +
      `**Type:** ${rule.action.type}\n\n` +
      (rule.action.storageClass ? `**Storage Class:** ${rule.action.storageClass}\n\n` : "") +
      `## Condition\n\n` +
      conditionText;

    push(
      <Detail
        navigationTitle={`Rule: ${rule.id}`}
        markdown={detailsMarkdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Rule ID" text={rule.id} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Action Type" text={rule.action.type} />
            {rule.action.storageClass && (
              <Detail.Metadata.Label title="Storage Class" text={rule.action.storageClass} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Conditions" />
            {rule.condition.age !== undefined && (
              <Detail.Metadata.Label title="Age (days)" text={rule.condition.age.toString()} />
            )}
            {rule.condition.createdBefore && (
              <Detail.Metadata.Label title="Created Before" text={rule.condition.createdBefore} />
            )}
            {rule.condition.isLive !== undefined && (
              <Detail.Metadata.Label title="Live Objects Only" text={rule.condition.isLive ? "Yes" : "No"} />
            )}
            {rule.condition.numNewerVersions !== undefined && (
              <Detail.Metadata.Label title="Newer Versions" text={rule.condition.numNewerVersions.toString()} />
            )}
            {rule.condition.matchesStorageClass && (
              <Detail.Metadata.Label title="Storage Classes" text={rule.condition.matchesStorageClass.join(", ")} />
            )}
            {rule.condition.matchesPrefix && (
              <Detail.Metadata.Label title="Prefixes" text={rule.condition.matchesPrefix.join(", ")} />
            )}
            {rule.condition.matchesSuffix && (
              <Detail.Metadata.Label title="Suffixes" text={rule.condition.matchesSuffix.join(", ")} />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Delete Rule"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={() => deleteRule(rule.id)}
            />
            <Action
              title="Back to Rules"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() => pop()}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={fetchLifecycleRules}
            />
          </ActionPanel>
        }
      />,
    );
  }

  function formatConditionKey(key: string): string {
    return key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
  }

  function getRuleIcon(rule: LifecycleRule) {
    if (rule.action.type === "Delete") {
      return { source: Icon.Trash, tintColor: Color.Red };
    } else if (rule.action.type === "SetStorageClass") {
      return { source: Icon.HardDrive, tintColor: Color.Blue };
    } else {
      return { source: Icon.Cog, tintColor: Color.PrimaryText };
    }
  }

  function getRuleSubtitle(rule: LifecycleRule): string {
    if (rule.action.type === "Delete") {
      return "Delete objects";
    } else if (rule.action.type === "SetStorageClass") {
      return `Change storage class to ${rule.action.storageClass}`;
    } else {
      return rule.action.type;
    }
  }

  function getRuleAccessories(rule: LifecycleRule) {
    const accessories = [];

    if (rule.condition.age !== undefined) {
      accessories.push({ text: `Age: ${rule.condition.age} days`, tooltip: "Age condition" });
    }

    if (rule.condition.createdBefore) {
      accessories.push({ text: `Before: ${rule.condition.createdBefore}`, tooltip: "Created before condition" });
    }

    if (rule.condition.numNewerVersions !== undefined) {
      accessories.push({
        text: `Versions: ${rule.condition.numNewerVersions}`,
        tooltip: "Number of newer versions condition",
      });
    }

    return accessories;
  }

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          title={error}
          description="Click to try again"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.RotateClockwise} onAction={fetchLifecycleRules} />
              <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search lifecycle rules..."
      navigationTitle={`Lifecycle Rules - ${bucketName}`}
      actions={
        <ActionPanel>
          <Action title="Add Rule" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} onAction={addNewRule} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={fetchLifecycleRules}
          />
          <Action title="Back" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "b" }} onAction={pop} />
        </ActionPanel>
      }
    >
      {lifecycleRules.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No lifecycle rules found"
          description={`Bucket "${bucketName}" has no lifecycle rules configured. Add a rule to automate object management.`}
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Add Rule"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={addNewRule}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={fetchLifecycleRules}
              />
              <Action title="Back" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "b" }} onAction={pop} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Lifecycle Rules"
          subtitle={`${lifecycleRules.length} ${lifecycleRules.length === 1 ? "rule" : "rules"}`}
        >
          {lifecycleRules.map((rule) => (
            <List.Item
              key={rule.id}
              title={rule.id}
              subtitle={getRuleSubtitle(rule)}
              icon={getRuleIcon(rule)}
              accessories={getRuleAccessories(rule)}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => viewRuleDetails(rule)}
                  />
                  <Action
                    title="Delete Rule"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={() => deleteRule(rule.id)}
                  />
                  <Action
                    title="Add Rule"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={addNewRule}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchLifecycleRules}
                  />
                  <Action
                    title="Back"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={pop}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
