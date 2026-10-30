import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { SKILLS } from "../engine/data";
import { levelOf, xpForLevel } from "../engine/engine";
import { bar, formatDuration } from "../engine/format";
import { awayMarkdown } from "../engine/away";
import { ripeCount } from "../engine/hydroponics";
import { FoodPriority, GameState, Report } from "../engine/types";
import { EAT_LEVELS, PLACES, SKILL_ICON } from "./constants";
import { PlaceScreen, SkillScreen } from "../screens";
import { Survivor } from "./survivor";

// --- overview ---------------------------------------------------------------

export function Overview(props: {
  state: GameState;
  away: Report | null;
  onDismissAway: () => void;
  frame: number;
  onStop: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: () => void;
  onSettings: (change: (s: GameState) => GameState) => void;
}) {
  const { state } = props;

  return (
    <>
      {props.away && (
        <List.Section title="While you were away">
          <List.Item
            title={`Away for ${formatDuration(props.away.elapsedMs)}`}
            subtitle={
              props.away.cycles ? `${props.away.cycles.toLocaleString("en-US")} tasks` : undefined
            }
            icon={Icon.Clock}
            accessories={
              Object.keys(props.away.rare).length
                ? [{ tag: { value: "Rare find", color: Color.Orange } }]
                : []
            }
            detail={
              <List.Item.Detail
                markdown={awayMarkdown(
                  props.away,
                  ripeCount(state) > 0 ? [`Hydroponics: ${ripeCount(state)} ready to harvest`] : [],
                )}
              />
            }
            actions={
              <ActionPanel>
                <Action title="Dismiss" icon={Icon.Check} onAction={props.onDismissAway} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <Survivor
        state={state}
        frame={props.frame}
        onStop={props.onStop}
        extraActions={
          <SurvivorSettings
            state={state}
            onSettings={props.onSettings}
            onExport={props.onExport}
            onImport={props.onImport}
            onReset={props.onReset}
          />
        }
      />
      <List.Section title="Skills">
        {SKILLS.map((skill) => {
          const level = levelOf(state, skill.id);
          const xp = state.xp[skill.id];
          const floor = xpForLevel(level);
          const next = xpForLevel(level + 1);
          return (
            <List.Item
              key={skill.id}
              title={skill.name}
              icon={SKILL_ICON[skill.id]}
              accessories={[{ tag: { value: `Lv ${level}`, color: Color.Blue } }]}
              detail={
                <List.Item.Detail
                  markdown={[
                    `# ${skill.name}`,
                    skill.blurb,
                    "",
                    "```",
                    `Lv ${level}  ${bar(next > floor ? (xp - floor) / (next - floor) : 1)}  ${Math.floor(xp)} XP`,
                    "```",
                  ].join("\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title={skill.id === "hydroponics" ? "Open Plots" : "Show Tasks"}
                    icon={Icon.ArrowRight}
                    target={<SkillScreen skill={skill.id} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Base and Economy">
        {PLACES.map((place) => (
          <List.Item
            key={place.id}
            title={place.title}
            icon={place.icon}
            detail={<List.Item.Detail markdown={`# ${place.title}\n${place.blurb}`} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Open ${place.title}`}
                  icon={Icon.ArrowRight}
                  target={<PlaceScreen place={place.id} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </>
  );
}

// --- tasks ------------------------------------------------------------------

function SurvivorSettings(props: {
  state: GameState;
  onReset: () => void;
  onExport: () => void;
  onImport: () => void;
  onSettings: (change: (s: GameState) => GameState) => void;
}) {
  const { state } = props;
  return (
    <>
      <ActionPanel.Submenu title="Auto-Eat at" icon={Icon.Heart}>
        {EAT_LEVELS.map(([value, label]) => (
          <Action
            key={value}
            title={label}
            icon={state.settings.eatBelow === value ? Icon.CheckCircle : Icon.Circle}
            onAction={() =>
              props.onSettings((s) => ({
                ...s,
                settings: { ...s.settings, eatBelow: value },
              }))
            }
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title="Eat First" icon={Icon.Box}>
        {(["weakest", "strongest"] as FoodPriority[]).map((priority) => (
          <Action
            key={priority}
            title={`${priority[0].toUpperCase()}${priority.slice(1)} Food`}
            icon={state.settings.foodPriority === priority ? Icon.CheckCircle : Icon.Circle}
            onAction={() =>
              props.onSettings((s) => ({
                ...s,
                settings: { ...s.settings, foodPriority: priority },
              }))
            }
          />
        ))}
      </ActionPanel.Submenu>
      <Action title="Copy Save to Clipboard" icon={Icon.CopyClipboard} onAction={props.onExport} />
      <Action title="Import Save from Clipboard" icon={Icon.Download} onAction={props.onImport} />
      <Action
        title="Reset Game"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={props.onReset}
      />
    </>
  );
}
