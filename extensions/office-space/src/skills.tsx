import { Action, ActionPanel, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Unavailable } from "./components/Unavailable";
import { abbreviate, linkTo } from "./lib/format";
import { hub } from "./lib/hub";
import { SkillLibraryReport, SkillSummary, SkillTarget } from "./lib/types";

const targetNames: Record<SkillTarget, string> = { claude: "Claude Code", codex: "Codex", cursor: "Cursor" };

function status(skill: SkillSummary): { icon: Icon; color: Color; text: string } {
  if (skill.issues.some((issue) => issue.severity === "error"))
    return { icon: Icon.XMarkCircle, color: Color.Red, text: "Has errors" };
  if (skill.placements.some((p) => p.state === "conflict" || p.state === "modified" || p.state === "failed")) {
    return { icon: Icon.ExclamationMark, color: Color.Orange, text: "Needs a look" };
  }
  if (skill.placements.length === 0) return { icon: Icon.Circle, color: Color.SecondaryText, text: "Not synced" };
  return { icon: Icon.CheckCircle, color: Color.Green, text: "Synced" };
}

async function setTargets(skill: SkillSummary, targets: SkillTarget[], onChange: () => void) {
  try {
    await hub(["skills", "targets", skill.name, targets.length ? targets.join(",") : "none"]);
    await showToast({
      style: Toast.Style.Success,
      title: `${skill.name}: ${targets.map((t) => targetNames[t]).join(", ") || "not synced"}`,
    });
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't change targets" });
  }
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => hub<SkillLibraryReport>(["skills"]));
  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search skills">
      {error && !data ? (
        <Unavailable error={error} />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Book}
            title="No skills yet"
            actions={
              <ActionPanel>
                <Action
                  title="Open Skills in Office Space"
                  icon={Icon.AppWindow}
                  onAction={() => open(linkTo("skills"))}
                />
              </ActionPanel>
            }
          />
          <List.Section title="Library">
            {(data?.skills ?? []).map((skill) => {
              const state = status(skill);
              return (
                <List.Item
                  key={skill.name}
                  icon={{ source: state.icon, tintColor: state.color }}
                  title={skill.name}
                  keywords={[skill.description]}
                  detail={
                    <List.Item.Detail
                      markdown={
                        `## ${skill.name}\n\n${skill.description || "_No description_"}` +
                        (skill.issues.length
                          ? "\n\n" + skill.issues.map((i) => `- **${i.severity}:** ${i.message}`).join("\n")
                          : "")
                      }
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Status" text={state.text} />
                          <List.Item.Detail.Metadata.TagList title="Synced to">
                            {skill.settings.targets.map((target) => (
                              <List.Item.Detail.Metadata.TagList.Item key={target} text={targetNames[target]} />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                          {skill.placements.map((placement) => (
                            <List.Item.Detail.Metadata.Label
                              key={placement.path + placement.target}
                              title={
                                targetNames[placement.target] +
                                (placement.project ? ` · ${placement.project.split("/").pop()}` : "")
                              }
                              text={placement.detail ? `${placement.state}: ${placement.detail}` : placement.state}
                            />
                          ))}
                          <List.Item.Detail.Metadata.Label title="Folder" text={abbreviate(skill.path)} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open in Office Space"
                        icon={Icon.AppWindow}
                        onAction={() => open(linkTo(`skills/${encodeURIComponent(skill.name)}`))}
                      />
                      <Action.Open title="Edit SKILL.md" icon={Icon.Pencil} target={`${skill.path}/SKILL.md`} />
                      <Action.Open
                        title="Open Folder in Cursor"
                        icon={Icon.Code}
                        target={skill.path}
                        application="Cursor"
                      />
                      <ActionPanel.Section title="Sync To">
                        {(["claude", "codex", "cursor"] as SkillTarget[]).map((target) => {
                          const on = skill.settings.targets.includes(target);
                          return (
                            <Action
                              key={target}
                              title={`${on ? "Stop Syncing to" : "Sync to"} ${targetNames[target]}`}
                              icon={on ? Icon.CheckCircle : Icon.Circle}
                              onAction={() =>
                                setTargets(
                                  skill,
                                  on
                                    ? skill.settings.targets.filter((t) => t !== target)
                                    : [...skill.settings.targets, target],
                                  revalidate,
                                )
                              }
                            />
                          );
                        })}
                      </ActionPanel.Section>
                      <Action.CopyToClipboard title="Copy Path" content={skill.path} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
          <List.Section title="Not in the Library">
            {(data?.foreign ?? [])
              .filter((skill) => !skill.inLibrary)
              .map((skill) => (
                <List.Item
                  key={skill.path}
                  icon={Icon.Download}
                  title={skill.name}
                  detail={
                    <List.Item.Detail
                      markdown={`## ${skill.name}\n\nIn ${targetNames[skill.target]}: \`${abbreviate(skill.path)}\`\n\n${skill.description}`}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Import into Library"
                        icon={Icon.Download}
                        onAction={async () => {
                          try {
                            await hub(["skills", "import", skill.path]);
                            await showToast({ style: Toast.Style.Success, title: `Imported ${skill.name}` });
                            revalidate();
                          } catch (error) {
                            await showFailureToast(error, { title: "Couldn't import" });
                          }
                        }}
                      />
                      <Action.ShowInFinder path={skill.path} />
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
