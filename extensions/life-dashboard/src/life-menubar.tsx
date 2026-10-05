import {
  Cache,
  Clipboard,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { compactNum, computeLifeStats, fmt, fmtDate, parseLifeInput, RawPrefs } from "./life-stats";
import { breakdownLine, getCountdowns } from "./countdowns";
import { randomQuote } from "./quotes";

const cache = new Cache();
export const MENUBAR_FLAG = "life-menubar-hidden";

export default function Command() {
  // Cache is synchronous, so a hidden menu bar returns null on the very
  // first render — an async read would paint the item before resolving.
  const hidden = cache.get(MENUBAR_FLAG) === "true";
  const prefs = getPreferenceValues<RawPrefs>();
  const input = parseLifeInput(prefs);
  const { data: countdowns } = usePromise(getCountdowns, []);

  if (hidden || !input) return null;

  const s = computeLifeStats(input);
  const quote = prefs.showQuotes !== false ? randomQuote() : undefined;
  const copy = (label: string, value: string) => () => Clipboard.copy(`${label}: ${value}`);
  const next = s.milestones.find((m) => !m.passed);

  return (
    <MenuBarExtra title={`⌛ ${s.lifePct.toFixed(1)}%`} tooltip="Life Dashboard — your life at a glance">
      <MenuBarExtra.Section title={`Day ${fmt(s.daysLived)} · ${s.lifePct.toFixed(1)}% of ${input.deathAge} years`}>
        <MenuBarExtra.Item
          title={`🎂 Age ${s.ageYears} · ${fmt(s.monthsLived)} months · ${fmt(s.weeksLived)} weeks`}
          onAction={copy("Age", String(s.ageYears))}
        />
        <MenuBarExtra.Item
          title={`🌱 ${s.yearsRemaining} years to ${s.deathYear} · ~${fmt(s.daysRemaining)} days`}
          onAction={copy("Years remaining", String(s.yearsRemaining))}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Celebrated">
        <MenuBarExtra.Item
          title={`🎈 ${fmt(s.birthdays)} birthdays · 🎡 ${fmt(s.weekends)} weekends`}
          onAction={copy("Birthdays", String(s.birthdays))}
        />
        <MenuBarExtra.Item
          title={`🎄 ${fmt(s.christmases)} · 🌙 ${fmt(s.ramadans)} Ramadans · ☀️ ${fmt(s.summers)} summers`}
          onAction={copy("Christmases", String(s.christmases))}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Body">
        <MenuBarExtra.Item
          title={`🛌 ~${fmt(s.daysSlept)} days slept · 🍽️ ~${compactNum(s.meals)} meals · ❤️ ~${compactNum(s.heartbeats)}`}
          onAction={copy("Days slept", String(s.daysSlept))}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Remaining">
        <MenuBarExtra.Item
          title={`⏰ ${s.daysLeftThisWeek} days this week · 🗓️ ${s.weeksLeftThisYear} weeks this year`}
          onAction={copy("Days left this week", String(s.daysLeftThisWeek))}
        />
      </MenuBarExtra.Section>
      {(countdowns ?? []).length > 0 && (
        <MenuBarExtra.Section title="Countdowns">
          {(countdowns ?? []).slice(0, 6).map((c) => (
            <MenuBarExtra.Item
              key={c.id}
              title={`${c.emoji || "🎯"} ${c.name} — ${breakdownLine(c.date)}`}
              onAction={copy(c.name, breakdownLine(c.date))}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {next && (
        <MenuBarExtra.Section title="Next milestone">
          <MenuBarExtra.Item
            title={`${next.emoji} ${next.title} — in ${fmt(next.inDays)} days (${fmtDate(next.date)})`}
            onAction={copy(next.title, fmtDate(next.date))}
          />
        </MenuBarExtra.Section>
      )}
      {quote && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`✨ “${quote.text.slice(0, 60)}${quote.text.length > 60 ? "…" : ""}”`}
            tooltip={`“${quote.text}” — ${quote.author}`}
            onAction={copy("Quote", `“${quote.text}” — ${quote.author}`)}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Life Progress"
          onAction={() => launchCommand({ name: "life-progress", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Hide from Menu Bar"
          onAction={async () => {
            cache.set(MENUBAR_FLAG, "true");
            try {
              await launchCommand({ name: "life-menubar", type: LaunchType.Background });
            } catch {
              // applies on the next interval refresh
            }
          }}
        />
        <MenuBarExtra.Item title="Preferences…" onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
