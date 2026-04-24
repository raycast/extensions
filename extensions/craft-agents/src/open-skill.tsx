import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { buildSkillLink } from "./lib/deeplink";
import { logger } from "./lib/logger";
import { getPrefs } from "./lib/preferences";
import { listSkills, type SkillRecord } from "./lib/skills";

async function openSkill(slug: string): Promise<void> {
  try {
    await open(buildSkillLink(slug));
  } catch (err) {
    logger.error("open-skill.open_failed", err, { slug });
    await showFailureToast(err, { title: "Failed to open skill" });
  }
}

function scopeIcon(rec: SkillRecord): Icon {
  return rec.scope === "global" ? Icon.Globe : Icon.House;
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      const prefs = getPrefs();
      return listSkills(prefs.workspaceRoot, prefs.globalSkillsDir);
    },
    [],
    { keepPreviousData: true },
  );

  const records = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter skills">
      {records.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Hammer}
          title="No skills found"
          description="Check the Workspace Root and Global Skills Dir preferences."
        />
      ) : null}
      {records.map((rec) => (
        <List.Item
          key={`${rec.scope}:${rec.slug}`}
          title={rec.displayName}
          subtitle={rec.description}
          icon={scopeIcon(rec)}
          accessories={[{ tag: rec.scope }]}
          keywords={[rec.slug]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Craft Agents"
                icon={Icon.ArrowRight}
                onAction={() => openSkill(rec.slug)}
              />
              <Action.CopyToClipboard title="Copy Slug" content={rec.slug} />
              <Action.CopyToClipboard title="Copy Deep Link" content={buildSkillLink(rec.slug)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
