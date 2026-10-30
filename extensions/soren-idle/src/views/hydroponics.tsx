import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { artMarkdown, buildingMarkdown } from "../art";
import { CROP_BY_ID, CROPS, ITEMS } from "../engine/data";
import { count, levelOf, xpForLevel } from "../engine/engine";
import { bar, formatBundle, formatDuration } from "../engine/format";
import { growRemainingMs, isRipe, plotAt, plotCount, ripeCount } from "../engine/hydroponics";
import { GameState, ItemId } from "../engine/types";
import { Notice } from "./notice";

export function Hydroponics(props: {
  state: GameState;
  frame: number;
  onPlant: (index: number, crop: string) => void;
  onHarvest: (index: number) => void;
  onHarvestAll: () => void;
}) {
  const { state } = props;
  const plots = plotCount(state);
  const level = levelOf(state, "hydroponics");

  if (plots === 0) {
    return (
      <Notice
        icon={Icon.Raindrop}
        title="No Hydroponic Bay"
        description="Build a Hydroponic Bay in Base to grow crops."
      />
    );
  }

  const ready = ripeCount(state);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const xp = state.xp.hydroponics;

  return (
    <List.Section title="Hydroponics" subtitle={`Level ${level} · ${ready} ready`}>
      {Array.from({ length: plots }, (_, index) => {
        const plot = plotAt(state, index);
        const crop = plot ? CROP_BY_ID[plot.crop] : undefined;
        const ripe = plot ? isRipe(state, plot) : false;
        const header = [
          crop
            ? artMarkdown(`hydro_${crop.id}`, props.frame, true)
            : buildingMarkdown("hydroponic_bay", plots, props.frame, true),
          `# Plot ${index + 1}`,
          "```",
          `Lv ${level}  ${bar(next > floor ? (xp - floor) / (next - floor) : 1)}  ${Math.floor(xp)} XP`,
          "```",
        ];
        return (
          <List.Item
            key={index}
            title={`Plot ${index + 1}`}
            subtitle={crop ? crop.name : "Empty"}
            icon={
              ripe
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : crop
                  ? Icon.Clock
                  : Icon.Circle
            }
            accessories={[
              plot && crop
                ? ripe
                  ? { tag: { value: "Ready", color: Color.Green } }
                  : { text: formatDuration(growRemainingMs(state, plot)) }
                : { tag: "Empty" },
            ]}
            detail={
              <List.Item.Detail
                markdown={[
                  ...header,
                  ...(crop && plot
                    ? [
                        crop.description,
                        "",
                        ripe
                          ? `**Ready.** Yields ${formatBundle(crop.yield)}.`
                          : `Grows in ${formatDuration(growRemainingMs(state, plot))}, then yields ${formatBundle(crop.yield)}.`,
                      ]
                    : ["Pick a crop to plant here.", "", ...cropLines(state)]),
                ].join("\n")}
              />
            }
            actions={
              <ActionPanel>
                {ripe && (
                  <Action
                    title="Harvest"
                    icon={Icon.Leaf}
                    onAction={() => props.onHarvest(index)}
                  />
                )}
                {ready > 1 && (
                  <Action
                    title="Harvest All Ready"
                    icon={Icon.Leaf}
                    onAction={props.onHarvestAll}
                  />
                )}
                {!plot && (
                  <ActionPanel.Submenu title="Plant" icon={Icon.Plus}>
                    {CROPS.map((c) => (
                      <Action
                        key={c.id}
                        title={`${c.name}${level < c.levelReq ? ` (Lv ${c.levelReq})` : ""}`}
                        onAction={() => props.onPlant(index, c.id)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

function cropLines(state: GameState): string[] {
  const level = levelOf(state, "hydroponics");
  return CROPS.map((c) => {
    const seeds = (Object.entries(c.seeds) as [ItemId, number][])
      .map(([id, n]) => `${count(state, id) >= n ? "✅" : "❌"} ${n}× ${ITEMS[id].name}`)
      .join(", ");
    const lock = level < c.levelReq ? ` _(Hydroponics ${c.levelReq})_` : "";
    return `- **${c.name}**${lock}: ${formatDuration(c.growMs)}, ${c.xp} XP. Seeds ${seeds} → ${formatBundle(c.yield)}`;
  });
}
