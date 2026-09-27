import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  updateCommandMetadata,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { compactNum, computeLifeStats, fmt, fmtDate, LifeStats, parseLifeInput, RawPrefs } from "./life-stats";
import { breakdownLine, getCountdowns } from "./countdowns";
import { randomQuote } from "./quotes";
import CountdownForm from "./CountdownForm";
import LifeGrid from "./life-grid";

const block = (pct: number, len = 24) => "█".repeat(Math.round((pct / 100) * len)).padEnd(len, "░");

function bigStat(emoji: string, value: string, caption: string, extra = ""): string {
  return `# ${emoji} ${value}\n\n**${caption}**${extra ? `\n\n${extra}` : ""}`;
}

function StatCard({ markdown, title }: { markdown: string; title: string }) {
  return <Detail navigationTitle={title} markdown={markdown} />;
}

export default function Command() {
  const prefs = getPreferenceValues<RawPrefs>();
  const input = parseLifeInput(prefs);
  const [quoteNonce, setQuoteNonce] = useState(0);
  const { data: countdowns, revalidate: reloadCountdowns } = usePromise(getCountdowns, []);

  useEffect(() => {
    if (!input) return;
    const s = computeLifeStats(input);
    updateCommandMetadata({
      subtitle: `☀️ Day ${fmt(s.daysLived)} · ${s.lifePct.toFixed(1)}% lived · ${s.yearsRemaining} years left`,
    });
  }, []);

  if (!input) {
    return (
      <List>
        <List.EmptyView
          icon="⌛"
          title="Set Your Birthday First"
          description="Add your birthday (1995-01-01) in the extension preferences — everything else is optional."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const s = computeLifeStats(input);
  const quote = prefs.showQuotes !== false ? randomQuote() : undefined;
  void quoteNonce;

  const row = (emoji: string, title: string, value: string, card: string, tooltip?: string) => (
    <List.Item
      key={title}
      icon={emoji}
      title={title}
      accessories={[{ text: value, tooltip }]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Card" icon={Icon.Maximize} target={<StatCard title={title} markdown={card} />} />
          <Action.Push title="Open Life Grid" icon={Icon.AppWindowGrid3x3} target={<LifeGrid />} />
          <Action.CopyToClipboard
            title="Copy"
            content={`${title}: ${value}`}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );

  const lifeCard = [
    `# ⌛ ${s.lifePct.toFixed(2)}%`,
    `**of an expected ${input.deathAge} years**`,
    `\`${block(s.lifePct)}\``,
    `${fmt(s.daysLived)} days down · ~${fmt(s.daysRemaining)} to go`,
    `\n${lifeGridPreview(s)}`,
  ].join("\n\n");

  const seasonsCard = [
    `# 🍂 ${fmt(s.springs + s.summers + s.autumns + s.winters)} seasons`,
    `🌸 **${s.springs}** springs`,
    `☀️ **${s.summers}** summers`,
    `🍁 **${s.autumns}** autumns`,
    `❄️ **${s.winters}** winters`,
  ].join("\n\n");

  return (
    <List searchBarPlaceholder={`Day ${fmt(s.daysLived)} — search your life…`}>
      {quote && (
        <List.Section title="✨ Memento">
          <List.Item
            icon="✨"
            title={quote.text}
            accessories={[{ text: `— ${quote.author}` }]}
            actions={
              <ActionPanel>
                <Action title="Another Quote" icon={Icon.Shuffle} onAction={() => setQuoteNonce((n) => n + 1)} />
                <Action.CopyToClipboard
                  title="Copy Quote"
                  content={`“${quote.text}” — ${quote.author}`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="⏳ Life Progress">
        <List.Item
          icon="🚀"
          title="Life lived"
          accessories={[
            { text: `${block(s.lifePct, 14)}`, tooltip: `Assuming ${input.deathAge} years` },
            { text: `${s.lifePct.toFixed(1)}%` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Card"
                icon={Icon.Maximize}
                target={<StatCard title="Life lived" markdown={lifeCard} />}
              />
              <Action.Push title="Open Life Grid" icon={Icon.AppWindowGrid3x3} target={<LifeGrid />} />
              <Action.CopyToClipboard
                title="Copy"
                content={`Life lived: ${s.lifePct.toFixed(1)}%`}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
        {row(
          "☀️",
          "Days lived",
          fmt(s.daysLived),
          bigStat("☀️", fmt(s.daysLived), "days lived", `That's ~${fmt(s.daysRemaining)} remaining.`),
        )}
        {row(
          "📅",
          "Weeks lived",
          fmt(s.weeksLived),
          bigStat("📅", fmt(s.weeksLived), "weeks lived", `Of ~${fmt(s.totalWeeks)} in a ${input.deathAge}-year life.`),
        )}
        {row("🗓️", "Months lived", fmt(s.monthsLived), bigStat("🗓️", fmt(s.monthsLived), "months lived"))}
        {row(
          "🎂",
          "Age",
          `${s.ageYears} years`,
          bigStat("🎂", String(s.ageYears), "years old", `Expected farewell year: **${s.deathYear}**`),
        )}
      </List.Section>
      <List.Section title="🎉 Celebrated">
        {row("🎈", "Birthdays", fmt(s.birthdays), bigStat("🎈", fmt(s.birthdays), "birthdays celebrated"))}
        {row("🎊", "New Year's Days", fmt(s.newYears), bigStat("🎊", fmt(s.newYears), "New Year's Days"))}
        {row("🎡", "Weekends enjoyed", fmt(s.weekends), bigStat("🎡", fmt(s.weekends), "weekends enjoyed"))}
        {prefs.showChristmas !== false &&
          row("🎄", "Christmases", fmt(s.christmases), bigStat("🎄", fmt(s.christmases), "Christmases"))}
        {prefs.showRamadan !== false &&
          row("🌙", "Ramadans", fmt(s.ramadans), bigStat("🌙", fmt(s.ramadans), "Ramadans", "Umm al-Qura calendar."))}
        {prefs.showLunarYears !== false &&
          row("🌖", "Lunar years", fmt(s.lunarYears), bigStat("🌖", fmt(s.lunarYears), "Hijri years witnessed"))}
        {row("🍂", "Seasons", `🌸${s.springs} ☀️${s.summers} 🍁${s.autumns} ❄️${s.winters}`, seasonsCard)}
      </List.Section>
      <List.Section title="😴 Your Body Has…">
        {row(
          "🛌",
          "Slept (in days)",
          `${fmt(s.daysSlept)} days`,
          bigStat("🛌", fmt(s.daysSlept), "days spent asleep", "~8 hours a night."),
          "~8 hours a night",
        )}
        {row(
          "🍽️",
          "Meals eaten",
          `~${fmt(s.meals)}`,
          bigStat("🍽️", `~${fmt(s.meals)}`, "meals eaten", "~3 a day."),
          "~3 a day",
        )}
        {row(
          "🚿",
          "Showers taken",
          `~${fmt(s.showers)}`,
          bigStat("🚿", `~${fmt(s.showers)}`, "showers taken", "~1 a day."),
          "~1 a day",
        )}
        {row(
          "❤️",
          "Heartbeats",
          `~${compactNum(s.heartbeats)}`,
          bigStat("❤️", `~${compactNum(s.heartbeats)}`, "heartbeats", "~80 bpm."),
          "~80 bpm",
        )}
        {row(
          "🌬️",
          "Breaths",
          `~${compactNum(s.breaths)}`,
          bigStat("🌬️", `~${compactNum(s.breaths)}`, "breaths", "~16 a minute."),
          "~16 a minute",
        )}
        {row("🌕", "Full moons seen", fmt(s.fullMoons), bigStat("🌕", fmt(s.fullMoons), "full moons seen"))}
      </List.Section>
      <List.Section title="🔮 Remaining">
        {row(
          "⏰",
          "Days left this week",
          fmt(s.daysLeftThisWeek),
          bigStat("⏰", String(s.daysLeftThisWeek), "days left this week"),
        )}
        {row(
          "🗓️",
          "Weeks left this year",
          fmt(s.weeksLeftThisYear),
          bigStat("🗓️", String(s.weeksLeftThisYear), "weeks left this year"),
        )}
        {row(
          "📆",
          "Months left this year",
          fmt(s.monthsLeftThisYear),
          bigStat("📆", String(s.monthsLeftThisYear), "months left this year"),
        )}
        {row(
          "🌱",
          "Years remaining",
          fmt(s.yearsRemaining),
          bigStat("🌱", String(s.yearsRemaining), "years remaining", `Until ~**${s.deathYear}**.`),
        )}
        {row(
          "🕰️",
          "Days remaining",
          `~${fmt(s.daysRemaining)}`,
          bigStat("🕰️", `~${fmt(s.daysRemaining)}`, "days remaining"),
        )}
        {row(
          "👋",
          "Expected farewell year",
          String(s.deathYear),
          bigStat("👋", String(s.deathYear), "expected farewell year"),
        )}
      </List.Section>
      {s.paychecks !== undefined && (
        <List.Section title="💰 Work Life">
          {row(
            "💵",
            "Paychecks received",
            `~${fmt(s.paychecks)}`,
            bigStat(
              "💵",
              `~${fmt(s.paychecks)}`,
              "paychecks received",
              input.paycheckCadence === "biweekly" ? "Every two weeks." : "Monthly.",
            ),
            input.paycheckCadence === "biweekly" ? "Every two weeks" : "Monthly",
          )}
          {row(
            "🧑‍💻",
            "Days since first workday",
            fmt(s.daysWorked ?? 0),
            bigStat("🧑‍💻", fmt(s.daysWorked ?? 0), "days since your first workday"),
          )}
        </List.Section>
      )}
      {(countdowns ?? []).length > 0 && (
        <List.Section title="🎯 Countdowns">
          {(countdowns ?? []).map((c) => (
            <List.Item
              key={c.id}
              icon={c.emoji || "🎯"}
              title={c.name}
              subtitle={c.date}
              accessories={[{ text: breakdownLine(c.date) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Card"
                    icon={Icon.Maximize}
                    target={
                      <StatCard
                        title={c.name}
                        markdown={bigStat(c.emoji || "🎯", breakdownLine(c.date), c.name, `**${c.date}**`)}
                      />
                    }
                  />
                  <Action.Push
                    title="Edit Countdown"
                    icon={Icon.Pencil}
                    target={<CountdownForm countdown={c} onDone={reloadCountdowns} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy"
                    content={`${c.name}: ${breakdownLine(c.date)}`}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="🏁 Milestones">
        {s.milestones.map((m) => (
          <List.Item
            key={m.title + m.date.toISOString()}
            icon={m.emoji}
            title={m.title}
            accessories={[
              { text: m.passed ? fmtDate(m.date) : `in ${fmt(m.inDays)} days` },
              m.passed ? { tag: { value: "Passed", color: "#3CB371" } } : { tag: { value: "Ahead", color: "#F5A623" } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Card"
                  icon={Icon.Maximize}
                  target={
                    <StatCard
                      title={m.title}
                      markdown={
                        m.passed
                          ? bigStat(m.emoji, fmtDate(m.date), m.title, `Passed **${fmt(-m.inDays)}** days ago.`)
                          : bigStat(m.emoji, `${fmt(m.inDays)} days`, `until ${m.title}`, `**${fmtDate(m.date)}**`)
                      }
                    />
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Milestone"
                  content={`${m.title}: ${fmtDate(m.date)}`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function lifeGridPreview(s: LifeStats): string {
  const pct = s.lifePct;
  const decades = 8;
  const perDecade = 100 / decades;
  const rows: string[] = [];
  for (let d = 0; d < decades; d++) {
    const start = d * perDecade;
    const filled = Math.max(0, Math.min(1, (pct - start) / perDecade));
    rows.push(`\`${String(d * 10).padStart(2, "0")}s ${block(filled * 100, 12)}\``);
  }
  return rows.join("\n\n");
}
