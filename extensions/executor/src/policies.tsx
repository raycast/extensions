import { WorkspaceAction } from "./components/workspace-command";
import { workspaceConfirmationMessage, workspaceTitle } from "./lib/workspaces";
import { withWorkspace } from "./components/workspace-command";
import { PolicyTargetPicker } from "./components/policy-target-picker";
import {
  Keyboard,
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { accountCacheKey, defaultOwner, listConnections, request } from "./lib/client";
import {
  POLICY_ACTION_DESCRIPTION,
  POLICY_ACTION_LABEL,
  POLICY_STATE_LABEL,
  createPolicyPayload,
  patternDescription,
  policyMatchesFilter,
  policyConnectionTarget,
  policyPresentation,
  policySummary,
  policyScopeLabel,
  updatePolicyPayload,
  validatePolicyPattern,
  type Policy,
  type PolicyAction,
  type PolicyFilter,
} from "./lib/policies";
import type { Owner } from "./lib/types";
import { codeBlock, connectionPresentation, titleCase } from "./lib/format";
import { escapeMarkdown } from "./lib/artifacts";
import { integrationIcon, integrationLabel, useIntegrationDirectory } from "./lib/integrations";

const ACTION_COLOR: Record<PolicyAction, Color> = {
  approve: Color.Green,
  require_approval: Color.Orange,
  block: Color.Red,
};

function usePolicyConnection(pattern: string) {
  const target = policyConnectionTarget(pattern);
  const { data = [] } = useCachedPromise(
    async (_scope: string, integration: string, owner: Owner | undefined) => {
      void _scope;
      if (!integration || !owner) return [];
      return listConnections({ integration, owner });
    },
    [accountCacheKey(), target?.integration ?? "", target?.owner],
  );
  return target ? connectionPresentation(target, data) : undefined;
}

function PolicyForm({
  policy,
  initialPattern,
  onSaved,
}: {
  policy?: Policy;
  initialPattern?: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [pattern, setPattern] = useState(policy?.pattern ?? initialPattern ?? "");
  const [editPattern, setEditPattern] = useState(!policy && !initialPattern);
  const directory = useIntegrationDirectory();
  const [action, setAction] = useState<PolicyAction>(policy?.action ?? "require_approval");
  const [owner, setOwner] = useState<Owner>(policy?.owner ?? defaultOwner() ?? "org");
  const [patternError, setPatternError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const saving = useRef(false);
  const presentation = policyPresentation(pattern);
  const provider = presentation.providerSlug ? integrationLabel(presentation.providerSlug, directory) : undefined;
  const targetLabel =
    pattern === "*"
      ? "All Tools"
      : pattern === `${presentation.providerSlug}.*`
        ? `All ${provider} Tools`
        : [provider, presentation.title].filter(Boolean).join(" · ");
  const segments = pattern.split(".");
  const connection = ["user", "org", "*"].includes(segments[1]) ? segments[2] : undefined;
  const displayedConnection = usePolicyConnection(pattern);

  async function onSubmit() {
    if (saving.current) return;
    const validationError = validatePolicyPattern(pattern);
    setPatternError(validationError);
    if (validationError) {
      setEditPattern(true);
      return;
    }
    const normalized = pattern.trim();
    const summary = policySummary({ owner, pattern: normalized, action });
    const confirmed = await confirmAlert({
      title: policy ? "Save Policy Changes?" : "Create Policy?",
      message: workspaceConfirmationMessage(
        `${summary}\n\nOther matching rules may take precedence or restrict this tool. Executor determines the final behavior.`,
      ),
      icon: action === "block" ? Icon.XMarkCircle : Icon.Shield,
      primaryAction: { title: policy ? "Save Policy" : "Create Policy" },
    });
    if (!confirmed || saving.current) return;

    saving.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: policy ? "Saving Policy" : "Creating Policy" });
    try {
      if (policy) {
        await request<Policy>(`/api/policies/${encodeURIComponent(policy.id)}`, {
          method: "PATCH",
          body: JSON.stringify(updatePolicyPayload(policy, { pattern: normalized, action })),
        });
      } else {
        await request<Policy>("/api/policies", {
          method: "POST",
          body: JSON.stringify(createPolicyPayload({ owner, pattern: normalized, action })),
        });
      }
      toast.style = Toast.Style.Success;
      toast.title = policy ? "Policy Saved" : "Policy Created";
      onSaved();
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: policy ? "Could Not Save Policy" : "Could Not Create Policy" });
    } finally {
      saving.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={workspaceTitle(policy ? "Edit Policy" : "New Policy")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={policy ? "Review and Save" : "Review and Create"}
            icon={Icon.Shield}
            onSubmit={onSubmit}
          />
          {!editPattern ? (
            <Action title="Edit Tool Pattern" icon={Icon.Code} onAction={() => setEditPattern(true)} />
          ) : null}
          <Action.CopyToClipboard title="Copy Pattern" content={pattern} shortcut={Keyboard.Shortcut.Common.Copy} />
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      {editPattern ? (
        <Form.TextField
          id="pattern"
          title="Tool Pattern"
          placeholder="github.*.*.issues.create"
          value={pattern}
          error={patternError}
          onBlur={(event) => setPatternError(validatePolicyPattern(event.target.value ?? ""))}
          onChange={(value) => {
            setPattern(value);
            if (patternError) setPatternError(undefined);
          }}
          info="Use an exact tool address, a trailing subtree wildcard, or complete * segments."
        />
      ) : (
        <Form.Description title="Applies To" text={targetLabel} />
      )}
      {connection ? (
        <Form.Description
          title="Connection"
          text={
            connection === "*"
              ? "Matching Connections"
              : (displayedConnection?.text ?? `${titleCase(connection)} · Personal and Workspace`)
          }
        />
      ) : null}
      <Form.Dropdown id="action" title="Action" value={action} onChange={(value) => setAction(value as PolicyAction)}>
        <Form.Dropdown.Item
          value="approve"
          title="Always Run"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          value="require_approval"
          title="Require Approval"
          icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Yellow }}
        />
        <Form.Dropdown.Item value="block" title="Block" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} />
      </Form.Dropdown>
      {policy ? (
        <Form.Description
          title="Policy Scope"
          text={`${policyScopeLabel(policy.owner)}. A policy stays in its original scope; create a separate rule for another scope.`}
        />
      ) : (
        <Form.Dropdown id="owner" title="Policy Scope" value={owner} onChange={(value) => setOwner(value as Owner)}>
          <Form.Dropdown.Item value="user" title="Personal" icon={Icon.Person} />
          <Form.Dropdown.Item value="org" title="Workspace" icon={Icon.TwoPeople} />
        </Form.Dropdown>
      )}
      <Form.Description
        title="Coverage"
        text={
          pattern === "*"
            ? "Every tool from every integration and connection."
            : pattern === `${presentation.providerSlug}.*`
              ? "Every current and future tool across this integration's connections."
              : patternDescription(pattern)
        }
      />
      <Form.Description title="Effect" text={POLICY_ACTION_DESCRIPTION[action]} />
      <Form.Description
        title="Audience"
        text={
          owner === "org"
            ? "This rule applies to everyone in this Executor workspace."
            : "This rule applies only to you, including when you use a shared connection."
        }
      />
      <Form.Description
        title="Other Policies"
        text="Other matching rules may take precedence or restrict this tool. Executor determines the final behavior."
      />
    </Form>
  );
}

function NewPolicy({ initialPattern, onSaved }: { initialPattern?: string; onSaved: () => void }) {
  return initialPattern ? (
    <PolicyForm initialPattern={initialPattern} onSaved={onSaved} />
  ) : (
    <PolicyTargetPicker policyForm={(pattern) => <PolicyForm initialPattern={pattern} onSaved={onSaved} />} />
  );
}

function usePolicies(initialData: Policy[] = []) {
  return useCachedPromise(
    (_scope: string) => {
      void _scope;
      return request<Policy[]>("/api/policies");
    },
    [accountCacheKey()],
    {
      initialData,
      failureToastOptions: { title: "Could Not Load Policies" },
    },
  );
}

function PolicyDetail({ policy, onChanged }: { policy: Policy; onChanged: () => void }) {
  const { data, isLoading, error, revalidate } = usePolicies([policy]);
  const directory = useIntegrationDirectory();
  const current = data?.find((item) => item.id === policy.id);
  const displayedConnection = usePolicyConnection(current?.pattern ?? policy.pattern);
  if (!current)
    return (
      <Detail
        navigationTitle={workspaceTitle("Policy Unavailable")}
        isLoading={isLoading}
        markdown="This policy is no longer available. Return to the list to view current policies."
      />
    );
  const presentation = policyPresentation(current.pattern);
  const provider = presentation.providerSlug
    ? integrationLabel(presentation.providerSlug, directory)
    : "All Integrations";
  const title =
    presentation.wildcard === "subtree" && !presentation.resource && presentation.providerSlug
      ? `${provider} Tools`
      : presentation.title;
  const segments = current.pattern.split(".");
  const connection = ["user", "org", "*"].includes(segments[1]) ? segments[2] : undefined;
  const onSaved = () => {
    revalidate();
    onChanged();
  };
  return (
    <Detail
      navigationTitle={workspaceTitle(title)}
      isLoading={isLoading}
      markdown={[
        `# ${escapeMarkdown(title)}`,
        POLICY_ACTION_DESCRIPTION[current.action],
        "### Applies To",
        presentation.wildcard === "exact"
          ? "This tool on the selected connection."
          : patternDescription(current.pattern),
        ...(error ? [`Could not refresh this policy: ${escapeMarkdown(error.message)}`] : []),
      ].join("\n\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Integration"
            text={provider}
            icon={presentation.providerSlug ? integrationIcon(presentation.providerSlug, directory) : Icon.Globe}
          />
          {presentation.resource ? <Detail.Metadata.Label title="Resource" text={presentation.resource} /> : null}
          {connection ? (
            <Detail.Metadata.Label
              title="Connection"
              text={connection === "*" ? "Matching Connections" : (displayedConnection?.text ?? titleCase(connection))}
            />
          ) : null}
          <Detail.Metadata.TagList title="Policy Scope">
            <Detail.Metadata.TagList.Item
              text={policyScopeLabel(current.owner)}
              color={current.owner === "org" ? Color.Purple : Color.Blue}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Action">
            <Detail.Metadata.TagList.Item
              text={POLICY_STATE_LABEL[current.action]}
              color={ACTION_COLOR[current.action]}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Policy"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<PolicyForm policy={current} onSaved={onSaved} />}
          />
          <Action.Push
            title="View Tool Pattern"
            icon={Icon.Code}
            target={
              <Detail
                navigationTitle={workspaceTitle("Tool Pattern")}
                markdown={codeBlock(current.pattern, "text")}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Pattern"
                      shortcut={Keyboard.Shortcut.Common.Copy}
                      content={current.pattern}
                    />
                    <WorkspaceAction />
                  </ActionPanel>
                }
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Pattern"
            shortcut={Keyboard.Shortcut.Common.Copy}
            content={current.pattern}
          />
          <WorkspaceAction />
        </ActionPanel>
      }
    />
  );
}

export function PolicyBrowser({
  initialPattern,
  isRootView = false,
}: {
  initialPattern?: string;
  isRootView?: boolean;
}) {
  const directory = useIntegrationDirectory();
  const [filter, setFilter] = useState<PolicyFilter>("all");
  const [searchText, setSearchText] = useState("");
  const deleting = useRef(false);
  const { data, isLoading, error, revalidate } = usePolicies();
  const policies = (data ?? []).filter((policy) => policyMatchesFilter(policy, filter));

  async function remove(policy: Policy) {
    if (deleting.current) return;
    const presentation = policyPresentation(policy.pattern);
    const target = [
      presentation.providerSlug ? integrationLabel(presentation.providerSlug, directory) : undefined,
      presentation.title,
    ]
      .filter(Boolean)
      .join(" · ");
    const confirmed = await confirmAlert({
      title: "Delete Policy?",
      message: workspaceConfirmationMessage(
        `${target}\nPolicy scope: ${policyScopeLabel(policy.owner)}\nAction: ${POLICY_ACTION_LABEL[policy.action]}\n\nRemoves this rule permanently. Remaining policies will determine whether matching tools can run.`,
      ),
      icon: Icon.Trash,
      primaryAction: { title: "Delete Policy", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed || deleting.current) return;
    deleting.current = true;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting Policy" });
    try {
      const result = await request<{ removed: boolean }>(`/api/policies/${encodeURIComponent(policy.id)}`, {
        method: "DELETE",
        body: JSON.stringify({ owner: policy.owner }),
      });
      if (!result.removed) throw new Error("Executor did not remove this policy. Reload and try again.");
      toast.style = Toast.Style.Success;
      toast.title = "Policy Deleted";
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could Not Delete Policy" });
    } finally {
      deleting.current = false;
    }
  }

  return (
    <List
      navigationTitle={isRootView ? undefined : workspaceTitle(initialPattern ? "Tool Policies" : "Manage Policies")}
      isLoading={isLoading}
      searchBarPlaceholder="Search tools, integrations, or policies"
      filtering
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Policies" value={filter} onChange={(value) => setFilter(value as PolicyFilter)}>
          <List.Dropdown.Item value="all" title="All Policies" icon={Icon.Shield} />
          <List.Dropdown.Section title="Policy Scope">
            <List.Dropdown.Item value="owner:user" title="Personal" icon={Icon.Person} />
            <List.Dropdown.Item value="owner:org" title="Workspace" icon={Icon.TwoPeople} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Action">
            <List.Dropdown.Item
              value="action:approve"
              title="Always Run"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            />
            <List.Dropdown.Item
              value="action:require_approval"
              title="Require Approval"
              icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Yellow }}
            />
            <List.Dropdown.Item
              value="action:block"
              title="Blocked"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Shield}
        title={error ? "Could Not Load Policies" : "No Matching Policies"}
        description={error ? error.message : "Create a policy to control how matching tools run."}
        actions={
          <ActionPanel>
            <Action.Push
              title="New Policy"
              shortcut={Keyboard.Shortcut.Common.New}
              icon={Icon.Plus}
              target={<NewPolicy initialPattern={initialPattern} onSaved={revalidate} />}
            />
            <Action
              shortcut={Keyboard.Shortcut.Common.Refresh}
              title="Reload Policies"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
            <WorkspaceAction />
          </ActionPanel>
        }
      />
      {policies.map((policy) => {
        const presentation = policyPresentation(policy.pattern);
        const provider = presentation.providerSlug
          ? integrationLabel(presentation.providerSlug, directory)
          : "All Integrations";
        const title =
          presentation.wildcard === "subtree" && !presentation.resource && presentation.providerSlug
            ? `${provider} Tools`
            : presentation.title;
        return (
          <List.Item
            key={policy.id}
            id={policy.id}
            icon={
              presentation.providerSlug
                ? integrationIcon(presentation.providerSlug, directory)
                : { source: Icon.Globe, tintColor: Color.SecondaryText }
            }
            title={title}
            subtitle={provider}
            keywords={[
              policy.pattern,
              title,
              presentation.target,
              provider,
              policyScopeLabel(policy.owner),
              policy.owner === "org" ? "Workspace" : "Personal",
              POLICY_ACTION_LABEL[policy.action],
              policy.id,
            ]}
            accessories={[
              { text: policyScopeLabel(policy.owner), tooltip: "Who this policy applies to in the current workspace" },
              {
                icon: {
                  source:
                    policy.action === "approve"
                      ? Icon.CheckCircle
                      : policy.action === "block"
                        ? Icon.XMarkCircle
                        : Icon.QuestionMarkCircle,
                  tintColor: ACTION_COLOR[policy.action],
                },
                tooltip: POLICY_STATE_LABEL[policy.action],
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Policy"
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    icon={Icon.Eye}
                    target={<PolicyDetail policy={policy} onChanged={revalidate} />}
                  />
                  <Action.Push
                    title="Edit Policy"
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    icon={Icon.Pencil}
                    target={<PolicyForm policy={policy} onSaved={revalidate} />}
                  />
                  <Action.Push
                    title="New Policy"
                    shortcut={Keyboard.Shortcut.Common.New}
                    icon={Icon.Plus}
                    target={<NewPolicy initialPattern={initialPattern} onSaved={revalidate} />}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Pattern"
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={policy.pattern}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Navigation">
                  <Action
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    title="Reload Policies"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                  <WorkspaceAction />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Delete Policy"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(policy)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ManagePolicies() {
  return <PolicyBrowser isRootView />;
}

export default withWorkspace(ManagePolicies);
