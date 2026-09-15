import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { LDEnvironment, LDFlag, LDFlagEnvironment, LDFlagEnvironmentStatus, LDTarget } from "../types";
import { getFlagUrl } from "../utils/ld-urls";
import {
  escapeMarkdownCell,
  formatClause,
  formatFallthrough,
  formatOffVariation,
  formatRelativeDate,
  formatRuleServe,
  formatServedValue,
  formatVariation,
  formatVariationLabel,
} from "../utils/format";
import {
  FLAG_STATUS_COLORS,
  FLAG_STATUS_HINTS,
  getEnvironmentIcon,
  getEnvironmentName,
  sortEnvironmentKeys,
} from "../utils/environments";
import { useSegmentNames } from "../hooks/useLDMetadata";
import { FlagActionContext, FlagOpenActions, FlagSecondaryActions } from "./FlagActions";

interface EnvironmentsListProps extends FlagActionContext {
  flag: LDFlag;
  environmentOrder: string[];
  environmentsByKey: Record<string, LDEnvironment>;
  statuses: Record<string, LDFlagEnvironmentStatus>;
  prerequisiteFlags: Record<string, LDFlag>;
  onMoveEnvironment: (envKey: string, direction: "up" | "down") => void;
}

function allTargets(env: LDFlagEnvironment): LDTarget[] {
  // `targets` holds user targets; `contextTargets` holds every other context kind.
  return [...(env.targets ?? []), ...(env.contextTargets ?? [])].filter((t) => t.values.length > 0);
}

function hasSegmentClauses(env: LDFlagEnvironment): boolean {
  return (env.rules ?? []).some((rule) => rule.clauses.some((c) => c.op === "segmentMatch"));
}

function targetingMarkdown(flag: LDFlag, env: LDFlagEnvironment, segmentNames: Record<string, string>): string {
  const variations = flag.variations ?? [];
  const targets = allTargets(env);
  const rules = env.rules ?? [];
  const lines: string[] = [];

  lines.push(
    `### ${env.on ? "🟢 On" : "⚪ Off"} — serving **${escapeMarkdownCell(formatServedValue(env, variations))}**`,
  );

  if (targets.length === 0 && rules.length === 0) {
    lines.push("", "_No individual targets or rules. Every context receives the default value above._");
    return lines.join("\n");
  }

  if (targets.length > 0) {
    lines.push("", "#### Individual targets", "", "| Context | Keys | Serves |", "| --- | --- | --- |");
    for (const target of targets) {
      const keys =
        target.values.length > 6
          ? `${target.values.slice(0, 6).join(", ")} … (+${target.values.length - 6})`
          : target.values.join(", ");
      lines.push(
        `| ${target.contextKind ?? "user"} | ${escapeMarkdownCell(keys)} | ${escapeMarkdownCell(formatVariation(variations[target.variation]))} |`,
      );
    }
  }

  if (rules.length > 0) {
    lines.push("", "#### Rules", "", "| # | If | Serve |", "| --- | --- | --- |");
    rules.forEach((rule, i) => {
      const conditions = rule.clauses.map((c) => escapeMarkdownCell(formatClause(c, segmentNames))).join("<br>AND ");
      const label = rule.description ? `${i + 1} (${escapeMarkdownCell(rule.description)})` : `${i + 1}`;
      lines.push(`| ${label} | ${conditions} | ${escapeMarkdownCell(formatRuleServe(rule, variations))} |`);
    });
    lines.push("", `_Rules are evaluated top to bottom; the first match wins, otherwise the fallthrough applies._`);
  }

  return lines.join("\n");
}

interface EnvironmentDetailProps {
  projectKey: string;
  envKey: string;
  env: LDFlagEnvironment;
  flag: LDFlag;
  environment?: LDEnvironment;
  status?: LDFlagEnvironmentStatus;
  prerequisiteFlags: Record<string, LDFlag>;
}

function EnvironmentDetail({
  projectKey,
  envKey,
  env,
  flag,
  environment,
  status,
  prerequisiteFlags,
}: EnvironmentDetailProps) {
  const variations = flag.variations ?? [];
  const segmentNames = useSegmentNames(projectKey, envKey, hasSegmentClauses(env));
  const targets = allTargets(env);
  const prerequisites = env.prerequisites ?? [];

  return (
    <List.Item.Detail
      markdown={targetingMarkdown(flag, env, segmentNames)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Environment" text={getEnvironmentName(envKey, env, environment)} />
          <List.Item.Detail.Metadata.Label title="Key" text={envKey} />
          <List.Item.Detail.Metadata.Label title="State" text={env.on ? "On" : "Off"} />
          {status && (
            <List.Item.Detail.Metadata.TagList title="Evaluation Status">
              <List.Item.Detail.Metadata.TagList.Item
                text={status.name}
                color={FLAG_STATUS_COLORS[status.name] ?? Color.SecondaryText}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          {status && (
            <List.Item.Detail.Metadata.Label
              title="Last Requested"
              text={status.lastRequested ? formatRelativeDate(status.lastRequested) : "never"}
            />
          )}
          {status && <List.Item.Detail.Metadata.Label title="" text={FLAG_STATUS_HINTS[status.name] ?? ""} />}
          {environment?.critical && (
            <List.Item.Detail.Metadata.TagList title="Criticality">
              <List.Item.Detail.Metadata.TagList.Item text="Critical environment" color={Color.Red} />
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Label
            title="Exceptions"
            text={`${targets.length} target${targets.length === 1 ? "" : "s"}, ${(env.rules ?? []).length} rule${(env.rules ?? []).length === 1 ? "" : "s"}`}
          />

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Default Behavior" />
          <List.Item.Detail.Metadata.Label title="When On" text={formatFallthrough(env, variations)} />
          <List.Item.Detail.Metadata.Label title="When Off" text={formatOffVariation(env, variations)} />

          {prerequisites.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Prerequisites" />
              {prerequisites.map((prereq) => {
                const prereqFlag = prerequisiteFlags[prereq.key];
                const variationName = prereqFlag
                  ? formatVariation(prereqFlag.variations[prereq.variation])
                  : formatVariationLabel(prereq.variation);
                return (
                  <List.Item.Detail.Metadata.Label
                    key={prereq.key}
                    title={prereqFlag?.name ?? prereq.key}
                    text={`must serve ${variationName}`}
                  />
                );
              })}
            </>
          )}
          {env.lastModified !== undefined && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Last Modified" text={formatRelativeDate(env.lastModified)} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function environmentAccessories(
  env: LDFlagEnvironment,
  environment?: LDEnvironment,
  status?: LDFlagEnvironmentStatus,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (status) {
    accessories.push({
      tag: { value: status.name, color: FLAG_STATUS_COLORS[status.name] ?? Color.SecondaryText },
      tooltip: FLAG_STATUS_HINTS[status.name],
    });
  }
  if (environment?.critical)
    accessories.push({ icon: { source: Icon.ExclamationMark, tintColor: Color.Red }, tooltip: "Critical environment" });
  if (env.archived) accessories.push({ tag: { value: "Archived", color: Color.Yellow } });
  return accessories;
}

export default function EnvironmentsList({
  flag,
  environmentOrder,
  environmentsByKey,
  statuses,
  prerequisiteFlags,
  onMoveEnvironment,
  ...context
}: EnvironmentsListProps) {
  const envKeys = sortEnvironmentKeys(Object.keys(flag.environments ?? {}), environmentOrder);

  return (
    <List.Section title="Environments">
      {envKeys.map((envKey) => {
        const env = flag.environments![envKey];
        const environment = environmentsByKey[envKey];
        const status = statuses[envKey];
        const url = getFlagUrl(context.projectKey, flag.key, envKeys, environmentOrder, envKey);

        return (
          <List.Item
            key={envKey}
            id={envKey}
            icon={getEnvironmentIcon(env.on, environment)}
            title={getEnvironmentName(envKey, env, environment)}
            subtitle={env.on ? "On" : "Off"}
            accessories={environmentAccessories(env, environment, status)}
            detail={
              <EnvironmentDetail
                projectKey={context.projectKey}
                envKey={envKey}
                env={env}
                flag={flag}
                environment={environment}
                status={status}
                prerequisiteFlags={prerequisiteFlags}
              />
            }
            actions={
              <ActionPanel>
                <FlagOpenActions flag={flag} url={url} {...context} />
                <Action.CopyToClipboard title="Copy Environment Key" content={envKey} />
                <FlagSecondaryActions flag={flag} url={url} {...context} />
                <ActionPanel.Section title="Order">
                  <Action
                    icon={Icon.ArrowUp}
                    title="Move up"
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => onMoveEnvironment(envKey, "up")}
                  />
                  <Action
                    icon={Icon.ArrowDown}
                    title="Move Down"
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => onMoveEnvironment(envKey, "down")}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
