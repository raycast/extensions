import { Action, Alert, Icon, showToast, Toast, confirmAlert } from "@raycast/api";
import { AUDIT_PROVIDER_LABELS, type Skill } from "../../shared";
import { useSkillAudits } from "../../hooks/useSkillAudits";
import { type SkillAuditsAvailability, type SkillAuditsResult, fetchSkillAudits } from "../../utils/skill-audits";
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
  const availabilityNotes: Record<SkillAuditsAvailability, string | undefined> = {
    "fetch-error": "Security audits could not be verified due to a network or server error",
    "parse-error": "Security audit data was found but could not be parsed reliably",
    "not-available": "No security audit data is currently available for this skill",
    available: undefined,
  };

  const failedAudits = auditResult.audits.filter((audit) => audit.status === "fail");
  const hasFailedAudits = failedAudits.length > 0;
  const failedProviders = hasFailedAudits
    ? joinWithAnd(failedAudits.map((audit) => AUDIT_PROVIDER_LABELS[audit.provider]))
    : "";

  const reviewMessage = "Review all details before installing.";
  return hasFailedAudits
    ? `This skill failed security audits by ${failedProviders}. ${reviewMessage}`
    : auditResult.availability === "available"
      ? "This will install the skill for all supported agents."
      : `${availabilityNotes[auditResult.availability]}. ${reviewMessage}`;
}

export function InstallSkillAction({ skill, prefetchedAuditResult }: InstallSkillActionProps) {
  const { result: cachedAuditResult } = useSkillAudits(skill, {
    shouldFetch: false,
    initialData: prefetchedAuditResult,
  });

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
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to install skill";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  };

  const handleInstall = async () => {
    let auditResult = cachedAuditResult;

    if (!auditResult) {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Checking security audits...",
        message: skill.name,
      });

      try {
        auditResult = await fetchSkillAudits(skill);
      } finally {
        await loadingToast.hide();
      }
    }

    if (!auditResult) {
      auditResult = {
        audits: [],
        availability: "fetch-error",
      };
    }

    const failedAudits = auditResult.audits.filter((audit) => audit.status === "fail");
    const hasFailedAudits = failedAudits.length > 0;
    const message = [getConfirmationMessage(auditResult), `Source: ${skill.source}`].join("\n\n");

    const confirmed = await confirmAlert({
      title: hasFailedAudits ? `Install unsafe "${skill.name}" skill?` : `Install "${skill.name}" skill?`,
      message,
      primaryAction: {
        title: hasFailedAudits ? "Install Anyway" : "Install",
        style: hasFailedAudits ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    await executeInstall();
  };

  return <Action title="Install Skill" icon={Icon.Download} onAction={handleInstall} />;
}
