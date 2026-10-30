import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { artMarkdown } from "../art";
import { AREAS, ITEMS, SKILL_BY_ID, TASK_BY_ID, TASKS } from "../engine/data";
import {
  count,
  damageAgainst,
  fightDamage,
  hitDamage,
  levelOf,
  modifiers,
  playerArmor,
  rareChanceMult,
  taskRates,
  taskDurationMs,
} from "../engine/engine";
import { bar, formatBundle, formatDuration, formatRates } from "../engine/format";
import {
  hasMastery,
  masteryLevel,
  masterySpeed,
  masteryXp,
  masteryXpForLevel,
  masteryYield,
  MASTERY_MAX,
  nodeHp,
  nodeMaxHp,
  nodeRespawnMs,
} from "../engine/mastery";
import { areaKills, areaOf, bossLockReason, counterTo, huntsOf, matchup } from "../engine/areas";
import { GameState, DamageType, ItemId, SkillId, TaskDef } from "../engine/types";
import { SKILL_ICON, RUN_CHOICES } from "./constants";
export function taskProgress(state: GameState, task: TaskDef): string {
  const duration = taskDurationMs(state, task);
  const runs = state.taskRemaining;
  return [
    "```",
    `${bar(state.taskProgressMs / duration)} ${formatDuration(duration - state.taskProgressMs)} left`,
    ...(runs !== null && !task.once ? [`${runs} run${runs === 1 ? "" : "s"} to go`] : []),
    ...nodeLines(state, task),
    "```",
  ].join("\n");
}

/** A resource node's health bar, or how long it takes to come back. */
function nodeLines(state: GameState, task: TaskDef): string[] {
  if (!task.node) return [];
  const wait = nodeRespawnMs(state, task);
  if (wait > 0) return [`Node spent, back in ${formatDuration(wait)}`];
  const max = nodeMaxHp(state, task);
  return [`Node ${bar(nodeHp(state, task) / max)} ${nodeHp(state, task)}/${max} HP`];
}

export function Tasks(props: {
  state: GameState;
  skill: SkillId;
  frame: number;
  onStart: (id: string, runs?: number) => void;
  onStop: () => void;
}) {
  const { state, skill } = props;
  const level = levelOf(state, skill);

  const keywords = (task: TaskDef) => [
    SKILL_BY_ID[task.skill].name,
    ...(
      Object.keys({
        ...task.inputs,
        ...task.outputs,
        ...task.monster?.drops,
      }) as ItemId[]
    ).map((id) => ITEMS[id].name),
    ...(task.rareDrops ?? []).map((d) => ITEMS[d.item].name),
    ...(task.monster ? [task.monster.name, task.monster.type] : []),
  ];

  const item = (task: TaskDef) => {
    const levelLocked = level < task.levelReq;
    const bossLock = bossLockReason(state, task);
    const locked = levelLocked || !!bossLock;
    const active = state.activeTask === task.id;
    const owned =
      task.once &&
      task.outputs &&
      (Object.keys(task.outputs) as ItemId[]).every((id) => count(state, id) > 0);
    return (
      <List.Item
        key={task.id}
        title={task.name}
        keywords={keywords(task)}
        icon={locked ? { source: Icon.Lock, tintColor: Color.SecondaryText } : SKILL_ICON[skill]}
        accessories={[
          ...(active ? [{ icon: { source: Icon.Play, tintColor: Color.Green } }] : []),
          ...(task.boss ? [{ tag: { value: "Boss", color: Color.Red } }] : []),
          ...(!locked && hasMastery(task)
            ? [{ tag: { value: `M${masteryLevel(state, task)}`, color: Color.Purple } }]
            : []),
          ...(levelLocked ? [{ tag: `Lv ${task.levelReq}` }] : []),
          ...(bossLock && !levelLocked ? [{ tag: "Locked" }] : []),
          ...(owned ? [{ tag: { value: "Owned", color: Color.Green } }] : []),
        ]}
        detail={<List.Item.Detail markdown={taskMarkdown(state, task, active, props.frame)} />}
        actions={
          <ActionPanel>
            {active ? (
              <Action title="Stop Task" icon={Icon.Stop} onAction={props.onStop} />
            ) : (
              <Action title="Start Task" icon={Icon.Play} onAction={() => props.onStart(task.id)} />
            )}
            {!active && !task.once && (
              <ActionPanel.Submenu title="Run a Set Number" icon={Icon.Repeat}>
                {RUN_CHOICES.map((n) => (
                  <Action key={n} title={`${n}×`} onAction={() => props.onStart(task.id, n)} />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel>
        }
      />
    );
  };

  if (skill === "combat") {
    return (
      <>
        {AREAS.map((area) => (
          <List.Section
            key={area.id}
            title={area.name}
            subtitle={`${areaKills(state, area)} defeated`}
          >
            {[...huntsOf(area), TASK_BY_ID[area.boss]].map(item)}
          </List.Section>
        ))}
      </>
    );
  }

  return (
    <List.Section title={SKILL_BY_ID[skill].name} subtitle={`Level ${level}`}>
      {TASKS.filter((t) => t.skill === skill).map(item)}
    </List.Section>
  );
}

/** Notes a combat-triangle advantage or disadvantage next to a stat. */
function matchupNote(
  attacker: DamageType | undefined,
  defender: DamageType | undefined,
  side: "deal" | "take",
) {
  const k = matchup(attacker, defender);
  if (k === 1) return "";
  const good = side === "deal" ? k > 1 : k < 1;
  return good ? " (good matchup)" : " (bad matchup)";
}

function masteryLines(state: GameState, task: TaskDef): string[] {
  const level = masteryLevel(state, task);
  const xp = masteryXp(state, task);
  const floor = masteryXpForLevel(level);
  const next = masteryXpForLevel(level + 1);
  const bonuses = [
    ...(task.node ? [`+${level - 1} node HP`] : []),
    ...(masterySpeed(level) < 1
      ? [`${Math.round((1 - masterySpeed(level)) * 1000) / 10}% faster`]
      : []),
    ...(masteryYield(level) > 0 ? [`${Math.round(masteryYield(level) * 100)}% bonus yield`] : []),
  ];
  return [
    `- **Mastery ${level}:** ${level >= MASTERY_MAX ? "maxed" : `${Math.floor(xp - floor).toLocaleString("en-US")} / ${(next - floor).toLocaleString("en-US")} XP`}${bonuses.length ? ` (${bonuses.join(", ")})` : ""}`,
  ];
}

function taskMarkdown(state: GameState, task: TaskDef, active: boolean, frame: number): string {
  const lines = [artMarkdown(task.id, frame, active), `# ${task.name}`, task.description, ""];
  if (active) lines.push(taskProgress(state, task), "");
  lines.push(`- **Time:** ${formatDuration(taskDurationMs(state, task))}`, `- **XP:** ${task.xp}`);
  const rates = taskRates(state, task);
  lines.push(
    `- **Per hour:** ${formatRates(rates.itemsPerHour)} · ${Math.round(rates.xpPerHour).toLocaleString("en-US")} XP`,
  );
  if (task.monster) lines.push(`- **HP lost per hour:** ~${Math.round(rates.hpLossPerHour)}`);
  if (task.inputs) lines.push(`- **Uses per hour:** ${formatRates(rates.inputsPerHour)}`);
  if (rates.nextLevelMs !== null)
    lines.push(`- **Next level in:** ${formatDuration(rates.nextLevelMs)} nonstop`);
  if (task.node) {
    const max = nodeMaxHp(state, task);
    lines.push(
      `- **Node:** ${max} HP, one per cycle, then ${formatDuration(task.node.respawnMs)} to respawn`,
    );
  }
  if (hasMastery(task)) lines.push(...masteryLines(state, task));
  if (task.rareDrops) {
    const mult = rareChanceMult(state);
    lines.push(
      `- **Rare finds:** ${task.rareDrops
        .map(
          (d) =>
            `${ITEMS[d.item].name} (${+(d.chance * mult * 100).toFixed(2)}% per ${task.monster ? "kill" : "cycle"})`,
        )
        .join(", ")}`,
    );
  }
  if (task.inputs) lines.push(`- **Needs:** ${formatBundle(task.inputs)}`);
  if (task.outputs) lines.push(`- **Makes:** ${formatBundle(task.outputs)}`);
  if (task.monster) {
    const m = task.monster;
    const area = areaOf(task.id);
    const mods = modifiers(state);
    const dealt = damageAgainst(state, task);
    const rounds = Math.ceil(m.hp / dealt);
    const bossLock = bossLockReason(state, task);
    lines.push(
      `- **Kill time:** ${formatDuration(taskDurationMs(state, task))} (${rounds} round${rounds === 1 ? "" : "s"}), then the next one steps up`,
      `- **Enemy:** ${m.name}, ${m.type} (${m.hp} HP, ${m.damage} dmg per hit)`,
      `- **Your damage:** ${dealt} per round${matchupNote(mods.weaponType, m.type, "deal")}`,
      `- **Armor:** ${playerArmor(state)}, hit for ${hitDamage(state, task)}${matchupNote(m.type, mods.armorType, "take")}`,
      `- **Best against it:** ${counterTo(m.type)} weapon and armor`,
      `- **Expected HP loss:** ~${fightDamage(state, task)}`,
      `- **Drops:** ${formatBundle(m.drops)}`,
    );
    if (task.boss) {
      lines.push(
        "",
        bossLock
          ? `**Locked.** ${bossLock}.`
          : "**Boss.** No eating once the fight starts, so heal first. It drops something unique.",
      );
    } else if (area) {
      lines.push(`- **Area:** ${area.name}`);
    }
  }
  return lines.join("\n");
}

// --- inventory --------------------------------------------------------------
