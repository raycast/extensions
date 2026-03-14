import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { SmitherySkill } from "../../api/types";
import { buildSkillInstallTemplate } from "../../constants/commands";
import { buildSkillUrl } from "../../constants/urls";
import { scoreToColor } from "../../utils/format";
import { getSmitheryExecutable } from "../../utils/smithery";
import { SkillDetail } from "./SkillDetail";
import { SkillInstallForm } from "./SkillInstallForm";

type SkillListItemProps = {
  skill: SmitherySkill;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
};

function InlineDetail({ skill }: { skill: SmitherySkill }) {
  const skillId = `${skill.namespace}/${skill.slug}`;
  const skillUrl = buildSkillUrl(skill.namespace, skill.slug);
  const installTemplate = buildSkillInstallTemplate(
    skillId,
    getSmitheryExecutable(),
  );
  const markdown = `# ${skill.displayName}

${skill.description ?? "No description available."}

Install this skill directly from Raycast or copy the install command.
`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Identifier" text={skillId} />
          <List.Item.Detail.Metadata.TagList title="Verified">
            <List.Item.Detail.Metadata.TagList.Item
              text={skill.verified ? "Yes" : "No"}
              color={skill.verified ? Color.Green : Color.Red}
            />
          </List.Item.Detail.Metadata.TagList>
          {skill.qualityScore !== undefined ? (
            <List.Item.Detail.Metadata.TagList title="Quality">
              <List.Item.Detail.Metadata.TagList.Item
                text={skill.qualityScore.toFixed(2)}
                color={scoreToColor(skill.qualityScore)}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {skill.categories.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Categories">
              {skill.categories.slice(0, 6).map((category) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={category}
                  text={category}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Link
            title="View on Smithery"
            text={skillId}
            target={skillUrl}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Install Command"
            text={installTemplate}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function SkillListItem({
  skill,
  isShowingDetail,
  onToggleDetail,
}: SkillListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  if (skill.categories.length > 0) {
    accessories.push({
      text: skill.categories.slice(0, 2).join(", "),
      tooltip: "Categories",
    });
  }

  if (skill.qualityScore !== undefined) {
    accessories.push({
      text: `Q ${skill.qualityScore.toFixed(2)}`,
      tooltip: "Quality score",
    });
  }

  if (skill.verified) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: "Verified",
    });
  }

  const skillId = `${skill.namespace}/${skill.slug}`;
  const skillUrl = buildSkillUrl(skill.namespace, skill.slug);
  const installTemplate = buildSkillInstallTemplate(
    skillId,
    getSmitheryExecutable(),
  );

  return (
    <List.Item
      title={skill.displayName}
      subtitle={isShowingDetail ? undefined : skill.description}
      accessories={isShowingDetail ? [] : accessories}
      id={`${skill.namespace}/${skill.slug}`}
      detail={<InlineDetail skill={skill} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add to Agent"
            icon={Icon.Plus}
            target={
              <SkillInstallForm
                namespace={skill.namespace}
                slug={skill.slug}
                displayName={skill.displayName}
              />
            }
          />
          <Action.Push
            title="View Details"
            icon={Icon.Sidebar}
            target={
              <SkillDetail namespace={skill.namespace} slug={skill.slug} />
            }
          />
          <Action
            title={isShowingDetail ? "Hide Detail Panel" : "Show Detail Panel"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={installTemplate}
          />
          <Action.OpenInBrowser title="Open on Smithery" url={skillUrl} />
        </ActionPanel>
      }
    />
  );
}
