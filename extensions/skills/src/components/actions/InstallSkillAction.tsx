import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { AUDIT_PROVIDER_LABELS, type Skill } from "../../shared";
import { useSkillAudits } from "../../hooks/useSkillAudits";
import { useAvailableAgents } from "../../hooks/useAvailableAgents";
import { type InstalledSkillMatch } from "../../hooks/useInstalledSkillMatches";
import { type SkillAuditsResult, fetchSkillAudits } from "../../utils/skill-audits";
import { installSkill } from "../../utils/skills-cli";
import { withSkillAction } from "../../utils/with-skill-action";

interface InstallSkillActionProps {
  skill: Skill;
  installedMatch: InstalledSkillMatch;
  prefetchedAuditResult?: SkillAuditsResult;
  onSkillInstalled?: () => void | Promise<void>;
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function formatAgentSummary(agents: string[]): string {
  if (agents.length === 0) return "the selected agents";
  if (agents.length <= 3) return joinWithAnd(agents);
  return `${agents.length} agents`;
}

type AuditRisk = "failed" | "unverified" | "pending" | "none";

const TITLE_SUFFIX_BY_RISK: Record<AuditRisk, string> = {
  failed: " despite failed security audits",
  unverified: " without verified security audits",
  pending: " despite pending security audits",
  none: "",
};

function getAuditRisk(auditResult: SkillAuditsResult): AuditRisk {
  const failedAudits = auditResult.audits.filter((audit) => audit.status === "fail");
  if (failedAudits.length > 0) return "failed";
  if (auditResult.availabilityState === "fetch-error" || auditResult.availabilityState === "parse-error") {
    return "unverified";
  }
  if (auditResult.availabilityState === "not-available" && auditResult.audits.length === 0) return "pending";
  return "none";
}

function getConfirmationMessage({
  auditResult,
  auditRisk,
  selectedAgents,
  replacementAgents,
  isReplacing,
}: {
  auditResult: SkillAuditsResult;
  auditRisk: AuditRisk;
  selectedAgents: string[];
  replacementAgents: string[];
  isReplacing: boolean;
}): string {
  const reviewMessage = `Review the skill details before ${isReplacing ? "replacing" : "installing"}.`;

  if (auditRisk === "failed") {
    const failedProviders = joinWithAnd(
      auditResult.audits
        .filter((audit) => audit.status === "fail")
        .map((audit) => AUDIT_PROVIDER_LABELS[audit.provider]),
    );
    return `Security audits by ${failedProviders} failed for this skill. ${reviewMessage}`;
  }
  if (auditRisk === "unverified") {
    return `Security audit data could not be verified for this skill. ${reviewMessage}`;
  }
  if (auditRisk === "pending") {
    return `Security audits are pending for this skill and its security status cannot be verified. ${reviewMessage}`;
  }

  if (isReplacing) {
    const replacementSet = new Set(replacementAgents);
    const additionalAgents = selectedAgents.filter((a) => !replacementSet.has(a));
    const replacePart = `This will replace the installed skill for ${formatAgentSummary(replacementAgents)}.`;
    if (additionalAgents.length === 0) return replacePart;
    return `${replacePart} It will also install the skill for ${formatAgentSummary(additionalAgents)}.`;
  }

  return `This will install the skill for ${formatAgentSummary(selectedAgents)}.`;
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

function buildConfirmation({
  skill,
  auditResult,
  selectedAgents,
  replacementAgents,
  isReplacing,
}: {
  skill: Skill;
  auditResult: SkillAuditsResult;
  selectedAgents: string[];
  replacementAgents: string[];
  isReplacing: boolean;
}) {
  const auditRisk = getAuditRisk(auditResult);
  const operation = isReplacing ? "Replace" : "Install";
  const hasAuditRisk = auditRisk !== "none";
  const message = [
    getConfirmationMessage({ auditResult, auditRisk, selectedAgents, replacementAgents, isReplacing }),
    `Source: ${skill.source}`,
  ].join("\n\n");

  return {
    title: `${operation} "${skill.name}"${TITLE_SUFFIX_BY_RISK[auditRisk]}?`,
    message,
    primaryAction: {
      title: hasAuditRisk ? `${operation} anyway` : operation,
      style: isReplacing || hasAuditRisk ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
    },
  };
}

interface AgentPickerInstallFormProps {
  skill: Skill;
  agents: string[];
  installedMatch: InstalledSkillMatch;
  prefetchedAuditResult?: SkillAuditsResult;
  onSkillInstalled?: () => void | Promise<void>;
}

function AgentPickerInstallForm({
  skill,
  agents,
  installedMatch,
  prefetchedAuditResult,
  onSkillInstalled,
}: AgentPickerInstallFormProps) {
  const { pop } = useNavigation();
  const installedAgentNames = installedMatch.type === "none" ? [] : installedMatch.agents;
  const installedAgents = new Set<string>(installedAgentNames);
  const replacementAgentNames = installedMatch.type === "conflict" ? installedAgentNames : [];
  const selectableAgents = agents.filter((a) => !installedAgents.has(a));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = selectableAgents.length > 0 && selected.size === selectableAgents.length;
  const isReplacing = installedMatch.type === "conflict";
  const installedSource = isReplacing ? (installedMatch.source ?? "Unknown source") : "";
  const submitTitle = isReplacing ? "Replace Installed Skill" : "Install Skill";

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
    const selectedAgents = Array.from(new Set([...replacementAgentNames, ...selected]));
    if (selectedAgents.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one agent" });
      return;
    }

    const auditResult = await resolveAuditResult(skill, prefetchedAuditResult);
    const { title, message, primaryAction } = buildConfirmation({
      skill,
      auditResult,
      selectedAgents,
      replacementAgents: replacementAgentNames,
      isReplacing,
    });

    const confirmed = await confirmAlert({
      title,
      message,
      primaryAction,
    });
    if (!confirmed) return;

    pop();

    await withSkillAction({
      toast: {
        animatedTitle: "Installing skill...",
        successTitle: "Skill installed successfully",
        successMessage: `${skill.name} is now available`,
        failureTitle: "Failed to install skill",
      },
      operation: () => installSkill(skill, selectedAgents),
      onSuccess: onSkillInstalled,
    });
  }

  return (
    <Form
      navigationTitle={`${isReplacing ? "Replace" : "Install"} "${skill.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={isReplacing ? Icon.Warning : Icon.Download}
            style={isReplacing ? Action.Style.Destructive : Action.Style.Regular}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Select agents to ${isReplacing ? "replace" : "install"} "${skill.name}".`} />
      {isReplacing && (
        <>
          <Form.Description text="This skill is already installed from another source." />
          <Form.Description text={`Current source: "${installedSource}"`} />
          <Form.Description text={`New source: "${skill.source}"`} />
        </>
      )}
      <Form.Checkbox id="select-all" label="Select All" value={allSelected} onChange={toggleAll} />
      <Form.Separator />
      {agents.map((agent) => {
        const isInstalled = installedAgents.has(agent);
        const label = isInstalled ? `${agent} (installed)` : agent;
        return (
          <Form.Checkbox
            key={agent}
            id={agent}
            label={label}
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

export function InstallSkillAction({
  skill,
  installedMatch,
  prefetchedAuditResult,
  onSkillInstalled,
}: InstallSkillActionProps) {
  const { agents, revalidate } = useAvailableAgents();
  const { push } = useNavigation();
  const { result: cachedAuditResult } = useSkillAudits(skill, {
    shouldFetch: false,
    initialData: prefetchedAuditResult,
  });

  const afterInstall = useCallback(async () => {
    await Promise.all([revalidate(), onSkillInstalled?.()]);
  }, [revalidate, onSkillInstalled]);

  const form = (
    <AgentPickerInstallForm
      skill={skill}
      agents={agents}
      installedMatch={installedMatch}
      prefetchedAuditResult={cachedAuditResult ?? prefetchedAuditResult}
      onSkillInstalled={afterInstall}
    />
  );

  if (installedMatch.type === "conflict") {
    return (
      <Action
        title="Replace Installed Skill"
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
        style={Action.Style.Destructive}
        onAction={() => {
          push(form);
        }}
      />
    );
  }

  return <Action.Push title="Install Skill" icon={Icon.Download} target={form} />;
}
