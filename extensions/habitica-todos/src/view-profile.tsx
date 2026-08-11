import {
  ActionPanel,
  Action,
  Icon,
  Detail,
  showToast,
  Toast,
  Color,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  getUser,
  forceCompleteQuest,
  acceptQuest,
  abortQuest,
  castSpell,
  allocateStat,
  allocateNow,
  toggleSleep,
  reviveUser,
} from "./api";
import { getAvatarSvg } from "./avatar";
import { HabiticaUser } from "./types";
import { SKILLS_BY_CLASS, STAT_LABELS } from "./constants";
import SkillCastForm from "./skill-cast-form";

const AVATAR_PLACEHOLDER = `data:image/svg+xml;base64,${Buffer.from(
  `<svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="140" rx="12" fill="#2d2c2a"/><circle cx="70" cy="52" r="22" fill="#444"/><ellipse cx="70" cy="110" rx="34" ry="24" fill="#444"/></svg>`,
).toString("base64")}`;

export default function Command() {
  const [user, setUser] = useState<HabiticaUser | null>(null);
  const [avatarUri, setAvatarUri] = useState<string>(AVATAR_PLACEHOLDER);
  const [isLoading, setIsLoading] = useState(true);
  const avatarGenRef = useRef(0); // incremented on each fetch to cancel stale avatar updates
  const { push } = useNavigation();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setAvatarUri(AVATAR_PLACEHOLDER);
    const gen = ++avatarGenRef.current;
    try {
      const data = await getUser();
      setUser(data);
      setIsLoading(false);
      // Fetch avatar in background; ignore result if a newer fetch has started
      getAvatarSvg(data)
        .then((uri) => {
          if (avatarGenRef.current === gen) setAvatarUri(uri);
        })
        .catch(() => {
          /* keep placeholder */
        });
    } catch (error) {
      setIsLoading(false);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load profile", message: String(error) });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = user?.stats;
  const quest = user?.party?.quest;
  const userClass = stats?.class;
  const userLevel = stats?.lvl ?? 0;
  const userMp = stats?.mp ?? 0;
  const skills = userClass ? (SKILLS_BY_CLASS[userClass] ?? []) : [];
  const unallocatedPoints = stats?.points ?? 0;
  const isSleeping = user?.preferences?.sleep ?? false;
  const isDead = stats ? stats.hp <= 0 : false;

  let questMarkdown = "### No Active Quest\n\nYou are not currently on a quest.";
  if (quest?.key) {
    questMarkdown = `### Active Quest\n**Status:** ${quest.active ? "Active" : "Pending"}\n\n`;
    if (quest.progress?.up !== undefined)
      questMarkdown += `**Progress:** ${Math.round(quest.progress.up)} damage queued.\n`;
    if (quest.progress?.collect)
      questMarkdown +=
        `**Items to Collect:**\n` +
        Object.entries(quest.progress.collect)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n");
  }

  const markdown = `![Avatar](${avatarUri})\n\n## Level ${stats?.lvl ?? 0}\n---\n\n${questMarkdown}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Level" text={String(stats?.lvl ?? 0)} icon={Icon.Crown} />
          <Detail.Metadata.Label
            title="Health"
            text={`${(stats?.hp ?? 0).toFixed(1)} / ${stats?.maxHealth ?? 50}`}
            icon={{ source: Icon.Heart, tintColor: Color.Red }}
          />
          <Detail.Metadata.Label
            title="Mana"
            text={`${(stats?.mp ?? 0).toFixed(1)}${stats?.maxMP ? ` / ${stats.maxMP}` : ""}`}
            icon={{ source: Icon.Star, tintColor: Color.Blue }}
          />
          <Detail.Metadata.Label
            title="Experience"
            text={`${(stats?.exp ?? 0).toFixed(1)} / ${stats?.toNextLevel ?? "?"}`}
            icon={{ source: Icon.ChevronUp, tintColor: Color.Yellow }}
          />
          <Detail.Metadata.Label
            title="Gold"
            text={(stats?.gp ?? 0).toFixed(2)}
            icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
          />
          {userClass && (
            <Detail.Metadata.Label
              title="Class"
              text={userClass.charAt(0).toUpperCase() + userClass.slice(1)}
              icon={Icon.Person}
            />
          )}
          {unallocatedPoints > 0 && (
            <Detail.Metadata.Label
              title="Stat Points"
              text={`${unallocatedPoints} unspent`}
              icon={{ source: Icon.Plus, tintColor: Color.Green }}
            />
          )}
          {isSleeping && (
            <Detail.Metadata.Label
              title="Resting"
              text="At the Tavern"
              icon={{ source: Icon.Moon, tintColor: Color.Blue }}
            />
          )}
          {quest?.key && (
            <Detail.Metadata.TagList title="Quest Status">
              <Detail.Metadata.TagList.Item
                text={quest.active ? "Active" : "Pending"}
                color={quest.active ? Color.Green : Color.Blue}
              />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Profile Actions">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={fetchData}
            />
            {isDead && (
              <Action
                title="Revive Character"
                icon={{ source: Icon.Heart, tintColor: Color.Red }}
                onAction={handleRevive}
              />
            )}
            <Action
              title={isSleeping ? "Wake up" : "Rest in Tavern"}
              icon={isSleeping ? Icon.Sun : Icon.Moon}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={handleToggleSleep}
            />
          </ActionPanel.Section>
          {skills.length > 0 && userLevel >= Math.min(...skills.map((s) => s.level)) && (
            <ActionPanel.Section title="Skills">
              {skills.map((skill) => {
                const canCast = userLevel >= skill.level && userMp >= skill.mana;
                const title = `${skill.name}${skill.targetsTask ? "…" : ""} (${skill.mana} MP)`;
                return (
                  <Action
                    key={skill.key}
                    title={title}
                    icon={{ source: Icon.Wand, tintColor: canCast ? Color.Blue : Color.SecondaryText }}
                    onAction={() => {
                      if (skill.targetsTask) {
                        if (userLevel < skill.level) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Level too low",
                            message: `${skill.name} unlocks at level ${skill.level}`,
                          });
                          return;
                        }
                        if (userMp < skill.mana) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Not enough mana",
                            message: `Needs ${skill.mana} MP — have ${userMp.toFixed(1)}`,
                          });
                          return;
                        }
                        push(<SkillCastForm spellId={skill.key} spellName={skill.name} onCast={fetchData} />);
                      } else {
                        handleCastSkill(skill.key, skill.name, skill.mana, skill.level);
                      }
                    }}
                  />
                );
              })}
            </ActionPanel.Section>
          )}
          {unallocatedPoints > 0 && (
            <ActionPanel.Section title={`Allocate Stat Point (${unallocatedPoints} left)`}>
              {(["str", "con", "int", "per"] as const).map((stat) => (
                <Action
                  key={stat}
                  title={`+1 ${STAT_LABELS[stat]}`}
                  icon={Icon.Plus}
                  onAction={() => handleAllocate(stat)}
                />
              ))}
              <Action title="Auto-Allocate All" icon={Icon.Stars} onAction={handleAllocateNow} />
            </ActionPanel.Section>
          )}
          {quest?.key && (
            <ActionPanel.Section title="Quest Actions">
              {!quest.active && (
                <Action title="Accept Quest" icon={Icon.CheckCircle} onAction={() => handleQuestAction("accept")} />
              )}
              {quest.active && (
                <Action
                  title="Force Complete Quest"
                  icon={Icon.Stars}
                  onAction={() => handleQuestAction("force-complete")}
                />
              )}
              <Action
                title="Abort Quest"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                onAction={() => handleQuestAction("abort")}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Habitica"
              url="https://habitica.com"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  async function handleCastSkill(spellId: string, name: string, mana: number, level: number) {
    if (userLevel < level) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Level too low",
        message: `${name} unlocks at level ${level}`,
      });
      return;
    }
    if (userMp < mana) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not enough mana",
        message: `Needs ${mana} MP — have ${userMp.toFixed(1)}`,
      });
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: `Casting ${name}…` });
      await castSpell(spellId);
      await showToast({ style: Toast.Style.Success, title: `Cast ${name}` });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Cast failed", message: String(error) });
    }
  }

  async function handleAllocate(stat: "str" | "con" | "int" | "per") {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Allocating to ${STAT_LABELS[stat]}…` });
      await allocateStat(stat);
      await showToast({ style: Toast.Style.Success, title: "Stat allocated" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
    }
  }

  async function handleAllocateNow() {
    const confirmed = await confirmAlert({
      title: "Auto-Allocate All Points",
      message: "Spend all unallocated stat points using your chosen automatic strategy?",
      primaryAction: { title: "Allocate" },
    });
    if (!confirmed) return;
    try {
      await showToast({ style: Toast.Style.Animated, title: "Allocating…" });
      await allocateNow();
      await showToast({ style: Toast.Style.Success, title: "Stats allocated" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
    }
  }

  async function handleToggleSleep() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Toggling tavern…" });
      await toggleSleep();
      await showToast({
        style: Toast.Style.Success,
        title: isSleeping ? "Woke up" : "Resting in the tavern",
      });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
    }
  }

  async function handleRevive() {
    const confirmed = await confirmAlert({
      title: "Revive Character",
      message: "Revive your character? You lose a level and a piece of equipment.",
      primaryAction: { title: "Revive", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await showToast({ style: Toast.Style.Animated, title: "Reviving…" });
      await reviveUser();
      await showToast({ style: Toast.Style.Success, title: "Revived" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
    }
  }

  async function handleQuestAction(action: "accept" | "abort" | "force-complete") {
    if (action === "abort") {
      const confirmed = await confirmAlert({
        title: "Abort Quest",
        message: "Abort the active quest for your party? This erases all party quest progress and cannot be undone.",
        primaryAction: { title: "Abort Quest", style: Alert.ActionStyle.Destructive },
      });

      if (!confirmed) return;
    }

    if (action === "force-complete") {
      const confirmed = await confirmAlert({
        title: "Force Complete Quest",
        message: "Force complete the active quest for your party? This affects all party members and cannot be undone.",
        primaryAction: { title: "Force Complete", style: Alert.ActionStyle.Destructive },
      });

      if (!confirmed) return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Processing…" });
      if (action === "accept") await acceptQuest();
      if (action === "abort") await abortQuest();
      if (action === "force-complete") await forceCompleteQuest();
      await showToast({ style: Toast.Style.Success, title: "Quest updated!" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: `Failed to ${action} quest`, message: String(error) });
    }
  }
}
