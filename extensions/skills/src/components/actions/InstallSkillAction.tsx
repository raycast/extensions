import { Action, Alert, Icon, showToast, Toast, confirmAlert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AUDIT_PROVIDER_LABELS, type Skill } from "../../shared";
import { useSkillAudits } from "../../hooks/useSkillAudits";
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

function getConfirmationMessage(auditResult: SkillAuditsResult): string {
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

  return "This will install the skill for all supported agents.";
}

export function InstallSkillAction({ skill, prefetchedAuditResult }: InstallSkillActionProps) {
  const { result: cachedAuditResult } = useSkillAudits(skill, {
    shouldFetch: false,
    initialData: prefetchedAuditResult,
  });

  const hideToastSafely = async (toast?: Awaited<ReturnType<typeof showToast>>) => {
    if (!toast) return;

    try {
      await toast.hide();
    } catch {
      // Ignore toast cleanup failures so confirmation can still proceed.
    }
  };

  const executeInstall = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing skill...",
      message: skill.name,
    });

    try {
      await installSkill(skill);

      toast.style = Toast.Style.Success;
      toast.title = "Skill installed successfully";
      toast.message = `${skill.name} is now available`;
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Failed to install skill" });
    }
  };

  const handleInstall = async () => {
    let auditResult = cachedAuditResult;

    if (!auditResult) {
      let loadingToast: Awaited<ReturnType<typeof showToast>> | undefined;

      try {
        loadingToast = await showToast({
          style: Toast.Style.Animated,
          title: "Checking security audits...",
          message: skill.name,
        });

        auditResult = await fetchSkillAudits(skill);
      } finally {
        await hideToastSafely(loadingToast);
      }
    }

    const failedAudits = auditResult.audits.filter((audit) => audit.status === "fail");
    const hasFailedAudits = failedAudits.length > 0;
    const hasVerificationError =
      auditResult.availabilityState === "fetch-error" || auditResult.availabilityState === "parse-error";
    const hasNoAudits = auditResult.availabilityState === "not-available" && auditResult.audits.length === 0;
    const requiresDestructiveConfirmation = hasFailedAudits || hasVerificationError || hasNoAudits;
    const message = [getConfirmationMessage(auditResult), `Source: ${skill.source}`].join("\n\n");

    const confirmed = await confirmAlert({
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
    });

    if (!confirmed) return;

    await executeInstall();
  };

  return <Action title="Install Skill" icon={Icon.Download} onAction={handleInstall} />;
}
