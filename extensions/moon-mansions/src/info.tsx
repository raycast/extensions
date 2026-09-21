import { Action, ActionPanel, Detail } from "@raycast/api";
import { getMoonInfo } from "./moon";

export default function Command() {
  const m = getMoonInfo();
  const markdown = `# ${m.emoji} ${m.phaseName}\n\n${m.illumPct.toFixed(1)}% illuminated · ${Math.round(
    m.age
  )} days old · in ${m.zodiac}\n\n**Mansion ${m.mansion.num} — ${m.mansion.name}**\n\nNakshatra ${m.nakshatra.n} ${
    m.nakshatra.name
  } · Xiu ${m.xiu.n} ${m.xiu.name} ${m.xiu.zh} (approx)`;
  const copyAll = `${m.phaseName} ${m.illumPct.toFixed(1)}% in ${m.zodiac} · Mansion ${m.mansion.num} ${
    m.mansion.name
  } · Nakshatra ${m.nakshatra.name} · Xiu ${m.xiu.name}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Moon Summary" content={copyAll} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Hijri" text={`🕌 ${m.cal.hijri}`} />
          <Detail.Metadata.Label title="Chinese day" text={`${m.cal.cnDayEmoji} ${m.cal.cnDay} · ${m.cal.cnDaySub}`} />
          <Detail.Metadata.Label
            title="Chinese month"
            text={`${m.cal.cnMonthEmoji} ${m.cal.cnMonth} · ${m.cal.cnMonthSub}`}
          />
          <Detail.Metadata.Label title="Tithi" text={`🕉️ ${m.cal.tithi}`} />
          <Detail.Metadata.Label title="Masa" text={`🌙 ${m.cal.masa}`} />
          <Detail.Metadata.Label title="Vara" text={`⭐ ${m.cal.vara}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Phase" text={`${m.emoji} ${m.phaseName}`} />
          <Detail.Metadata.Label title="Illumination" text={`✨ ${m.illumPct.toFixed(1)}%`} />
          <Detail.Metadata.Label title="Zodiac" text={m.zodiac} />
          <Detail.Metadata.Label title="Moon age" text={`⏳ ${Math.round(m.age)} days`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Mansion number" text={`🔢 ${m.mansion.num}`} />
          <Detail.Metadata.Label title="Mansion name" text={`🏷️ ${m.mansion.name}`} />
          <Detail.Metadata.Label title="Divine Name" text={`🤲 ${m.mansion.divineName}`} />
          <Detail.Metadata.Label title="Degrees" text={`📐 ${m.mansion.deg}`} />
          <Detail.Metadata.Label title="Rating" text={m.mansion.rating} />
          <Detail.Metadata.Label title="Theme" text={`💭 ${m.mansion.theme}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Nakshatra" text={`🕉️ ${m.nakshatra.n} · ${m.nakshatra.name}`} />
          <Detail.Metadata.Label title="Ruled by" text={`${m.nakshatra.planet} · ${m.nakshatra.deity}`} />
          <Detail.Metadata.Label title="Theme" text={`💭 ${m.nakshatra.theme}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Chinese lodge" text={`🐉 ${m.xiu.n} · ${m.xiu.name} ${m.xiu.zh} (approx)`} />
          <Detail.Metadata.Label title="Palace" text={m.xiu.group} />
          <Detail.Metadata.Label title="Theme" text={`💭 ${m.xiu.theme}`} />
          <Detail.Metadata.Separator />
          {m.planets.map((p) => (
            <Detail.Metadata.Label
              key={p.name}
              title={`${p.symbol} ${p.name}`}
              text={`${p.deg} ${p.sign} · ${p.motion}`}
            />
          ))}
        </Detail.Metadata>
      }
    />
  );
}
