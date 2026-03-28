import { Action, ActionPanel, Alert, Form, Icon, showToast, Toast, confirmAlert, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { AUDIT_PROVIDER_LABELS, type Skill } from "../../shared";
import { useSkillAudits } from "../../hooks/useSkillAudits";
import { useAvailableAgents } from "../../hooks/useAvailableAgents";
import { type SkillAuditsResult, fetchSkillAudits } from "../../utils/skill-audits";
import { installSkill } from "../../utils/skills-cli";

interface InstallSkillActionProps {
  skill: Skill;
  prefetchedAuditResult?: SkillAuditsResult;
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getConfirmationMessage(auditResult: SkillAuditsResult, agentLabel?: string): string {
  const failedAudits = auditResult.audits.filter((audit) => audit.status === "fail");
  const hasFailedAudits = failedAudits.length > 0;
  const failedProviders = hasFailedAudits
    ? joinWithAnd(failedAudits.map((audit) => AUDIT_PROVIDER_LABELS[audit.provider]))
    : "";
  const hasVerificationError =
    auditResult.availabilityState === "fetch-error" || auditResult.availabilityState === "parse-error";
  const hasNoAudits = auditResult.availabilityState === "not-available" && auditResult.audits.length === 0;

  const reviewMessage = "Review the skill details before installing.";
  if (hasFailedAudits) {
    return `Security audits by ${failedProviders} failed for this skill. ${reviewMessage}`;
  }
  if (hasVerificationError) {
    return `Security audit data could not be verified for this skill. ${reviewMessage}`;
  }
  if (hasNoAudits) {
    return `Security audits are pending for this skill and its security status cannot be verified. ${reviewMessage}`;
  }

  return agentLabel
    ? `This will install the skill for ${agentLabel}.`
    : "This will install the skill for all supported agents.";
}

async function hideToastSafely(toast?: Awaited<ReturnType<typeof showToast>>): Promise<void> {
  if (!toast) return;
  try {
    await toast.hide();
  } catch {
    // Ignore toast cleanup failures so confirmation can still proceed.
  }
}

async function resolveAuditResult(skill: Skill, cached?: SkillAuditsResult): Promise<SkillAuditsResult> {
  if (cached) return cached;
  let loadingToast: Awaited<ReturnType<typeof showToast>> | undefined;
  try {
    loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking security audits...",
      message: skill.name,
    });
    return await fetchSkillAudits(skill);
  } finally {
    await hideToastSafely(loadingToast);
  }
}

function buildConfirmation(skill: Skill, auditResult: SkillAuditsResult, agentLabel?: string) {
  const failedAudits = auditResult.audits.filter((a) => a.status === "fail");
  const hasFailedAudits = failedAudits.length > 0;
  const hasVerificationError =
    auditResult.availabilityState === "fetch-error" || auditResult.availabilityState === "parse-error";
  const hasNoAudits = auditResult.availabilityState === "not-available" && auditResult.audits.length === 0;
  const requiresDestructiveConfirmation = hasFailedAudits || hasVerificationError || hasNoAudits;
  const message = [getConfirmationMessage(auditResult, agentLabel), `Source: ${skill.source}`].join("\n\n");

  return {
    title: hasFailedAudits
      ? `Install "${skill.name}" despite failed security audits?`
      : hasVerificationError
        ? `Install "${skill.name}" without verified security audits?`
        : hasNoAudits
          ? `Install "${skill.name}" despite pending security audits?`
          : `Install "${skill.name}"?`,
    message,
    primaryAction: {
      title: requiresDestructiveConfirmation ? "Install anyway" : "Install",
      style: requiresDestructiveConfirmation ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
    },
  };
}

interface AgentPickerInstallFormProps {
  skill: Skill;
  agents: string[];
  installedAgents: string[];
  prefetchedAuditResult?: SkillAuditsResult;
}

function AgentPickerInstallForm({
  skill,
  agents,
  installedAgents,
  prefetchedAuditResult,
}: AgentPickerInstallFormProps) {
  const { pop } = useNavigation();
  const installedSet = new Set(installedAgents);
  const selectableAgents = agents.filter((a) => !installedSet.has(a));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = selectableAgents.length > 0 && selected.size === selectableAgents.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableAgents));
  }

  function toggleAgent(agent: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(agent);
      else next.delete(agent);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one agent" });
      return;
    }

    const selectedAgents = [...selected];
    const agentLabel = joinWithAnd(selectedAgents);
    const auditResult = await resolveAuditResult(skill, prefetchedAuditResult);
    const confirmed = await confirmAlert(buildConfirmation(skill, auditResult, agentLabel));
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing skill...",
      message: skill.name,
    });

    try {
      pop();
      await installSkill(skill, selectedAgents);
      toast.style = Toast.Style.Success;
      toast.title = "Skill installed successfully";
      toast.message = `${skill.name} is now available`;
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Failed to install skill" });
    }
  }

  return (
    <Form
      navigationTitle={`Install "${skill.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Select agents to install "${skill.name}" to:`} />
      <Form.Checkbox id="select-all" label="Select All" value={allSelected} onChange={toggleAll} />
      <Form.Separator />
      {agents.map((agent) => {
        const isInstalled = installedSet.has(agent);
        return (
          <Form.Checkbox
            key={agent}
            id={agent}
            label={isInstalled ? `${agent} (installed)` : agent}
            value={isInstalled || selected.has(agent)}
            onChange={(checked) => {
              if (!isInstalled) toggleAgent(agent, checked);
            }}
          />
        );
      })}
    </Form>
  );
}

export function InstallSkillAction({ skill, prefetchedAuditResult }: InstallSkillActionProps) {
  const { agents, skillAgentMap } = useAvailableAgents();
  const { result: cachedAuditResult } = useSkillAudits(skill, {
    shouldFetch: false,
    initialData: prefetchedAuditResult,
  });
  // skillAgentMap is keyed by the CLI's installed skill name, which matches
  // the skillId used in `skills add source@skillId`.
  const installedAgents = skillAgentMap[skill.skillId] ?? [];

  return (
    <Action.Push
      title="Install Skill"
      icon={Icon.Download}
      target={
        <AgentPickerInstallForm
          skill={skill}
          agents={agents}
          installedAgents={installedAgents}
          prefetchedAuditResult={cachedAuditResult ?? prefetchedAuditResult}
        />
      }
    />
  );
}
