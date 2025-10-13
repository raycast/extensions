import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { LDFlag, LDFlagEnvironment, LDFlagRule, LDVariation } from "../types";
import { capitalizeFirstLetter } from "../utils/stringUtils";
import { getLDUrlWithEnvs } from "../utils/ld-urls";

interface EnvironmentsListProps {
  flag: LDFlag;
  environmentOrder: string[];
  onMoveEnvironment: (envKey: string, direction: "up" | "down") => void;
}

function formatVariation(variation: LDVariation | undefined): string {
  if (!variation) return "(No variation)";
  if (variation.name) return variation.name;
  return JSON.stringify(variation.value);
}

function formatRuleCompact(rule: LDFlagRule, variations: LDVariation[]): string {
  const conditions = rule.clauses
    .map((clause) => {
      const op = clause.negate ? `NOT ${clause.op}` : clause.op;
      return `${clause.attribute} ${op} ${clause.values.join(", ")}`;
    })
    .join(" AND ");

  if (rule.variation === undefined && !rule.rollout) {
    return conditions;
  }

  const prefix = `IF ${conditions} → `;

  if (rule.variation !== undefined && rule.rollout) {
    const singleVar = formatVariation(variations[rule.variation]);
    const rollouts = formatRollouts(rule.rollout.variations, variations);
    return `${prefix}[Variation: ${singleVar}, Rollout: [${rollouts}]]`;
  }

  if (rule.variation !== undefined) {
    return `${prefix}${formatVariation(variations[rule.variation])}`;
  }

  if (rule.rollout) {
    const rollouts = formatRollouts(rule.rollout.variations, variations);
    return `${prefix}Split [${rollouts}]`;
  }

  return conditions;
}

function formatRollouts(rolloutVariations: { weight: number; variation: number }[], variations: LDVariation[]): string {
  return rolloutVariations.map((v) => `${v.weight} ${formatVariation(variations[v.variation])}`).join(", ");
}

function formatFallthrough(env: LDFlagEnvironment, variations: LDVariation[]): string {
  if (env.fallthrough?.rollout) {
    const rollouts = env.fallthrough.rollout.variations
      .map((v) => `${v.weight} ${formatVariation(variations[v.variation])}`)
      .join(", ");
    return `Split [${rollouts}]`;
  }

  if (env.fallthrough?.variation !== undefined) {
    return formatVariation(variations[env.fallthrough.variation]);
  }

  return "(No fallthrough)";
}

function EnvironmentDetail({ envKey, env, flag }: { envKey: string; env: LDFlagEnvironment; flag: LDFlag }) {
  const envOn = env.on;
  const fallthroughIndex = env.fallthrough?.variation ?? 0;
  const offIndex = env.offVariation ?? 0;
  const variations = flag.variations || [];
  const currentVariationIndex = envOn ? fallthroughIndex : offIndex;
  const currentValue = variations[currentVariationIndex];
  const currentValueText = formatVariation(currentValue);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={flag.name || flag.key} />
          <List.Item.Detail.Metadata.Label title="Environment" text={capitalizeFirstLetter(envKey)} />
          <List.Item.Detail.Metadata.Label title="State" text={envOn ? "Enabled" : "Disabled"} />
          <List.Item.Detail.Metadata.Label title="Current Value" text={currentValueText} />
          <List.Item.Detail.Metadata.Label
            title="Exceptions"
            text={`${env.targets?.length || 0} targets, ${env.rules?.length || 0} rules`}
          />
          {(env.targets?.length > 0 || env.rules?.length > 0) && (
            <>
              <List.Item.Detail.Metadata.Label
                title=""
                text="This flag has custom targeting rules that may override the default value"
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          {env.targets?.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Label title="Targeting" />
              {env.targets.map((target, i) => (
                <List.Item.Detail.Metadata.Label
                  key={i}
                  title={`Users ${target.values.join(", ")}`}
                  text={formatVariation(flag.variations[target.variation])}
                />
              ))}
            </>
          )}
          {env.rules?.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Label title="Rules" />
              {env.rules.map((rule, i) => (
                <List.Item.Detail.Metadata.Label
                  key={i}
                  title={`Rule ${i + 1}`}
                  text={formatRuleCompact(rule, variations)}
                />
              ))}
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Default Behavior" />
          <List.Item.Detail.Metadata.Label title="When Enabled" text={formatFallthrough(env, variations)} />
          <List.Item.Detail.Metadata.Label title="When Disabled" text={formatVariation(variations[env.offVariation])} />
          {env.prerequisites?.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Prerequisites" />
              {env.prerequisites.map((prereq, i) => (
                <List.Item.Detail.Metadata.Label key={i} title={prereq.key} text={`must be ${prereq.variation}`} />
              ))}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function getEnvironmentAccessories(env: LDFlagEnvironment): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (env.archived) {
    accessories.push({ tag: { value: "Archived", color: Color.Yellow } });
  }

  return accessories;
}

export default function EnvironmentsList({ flag, environmentOrder, onMoveEnvironment }: EnvironmentsListProps) {
  function handleMove(envKey: string, direction: "up" | "down") {
    onMoveEnvironment(envKey, direction);
  }

  const sortedEnvironments = Object.entries(flag.environments || {}).sort(([aKey], [bKey]) => {
    const aIndex = environmentOrder.indexOf(aKey);
    const bIndex = environmentOrder.indexOf(bKey);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <List.Section title="Environments">
      {sortedEnvironments.map(([envKey, env]) => (
        <List.Item
          key={envKey}
          icon={env.on ? Icon.CircleFilled : Icon.Circle}
          title={capitalizeFirstLetter(envKey)}
          accessories={getEnvironmentAccessories(env)}
          detail={<EnvironmentDetail envKey={envKey} env={env} flag={flag} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={Icon.Globe}
                title="Open in Launchdarkly"
                url={getLDUrlWithEnvs(flag, environmentOrder, envKey)}
              />
              <Action.CopyToClipboard title="Copy Feature Flag Key" content={flag.key} />
              <Action.CopyToClipboard title="Copy Environment Key" content={envKey} />
              <Action
                icon={Icon.ArrowUp}
                title="Move Up"
                shortcut={{ modifiers: ["cmd", "ctrl"], key: "arrowUp" }}
                onAction={() => handleMove(envKey, "up")}
              />
              <Action
                icon={Icon.ArrowDown}
                title="Move Down"
                shortcut={{ modifiers: ["cmd", "ctrl"], key: "arrowDown" }}
                onAction={() => handleMove(envKey, "down")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
