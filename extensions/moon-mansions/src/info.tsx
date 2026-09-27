import { Action, ActionPanel, Detail } from "@raycast/api";
import { getMoonInfo, nakshatraTheme, planetDetailLine, vocEndLabel } from "./moon";

export default function Command() {
  const m = getMoonInfo();
  const rows = m.planets
    .map((p) => `| ${p.name} | ${p.deg} ${p.sign} | ${p.sidDeg} ${p.sidSign} | ${p.motion} |`)
    .join("\n");
  const markdown = `# ${m.emoji} ${m.phaseName}\n\n${m.illumPct.toFixed(
    1
  )}% illuminated (${m.trend.toLowerCase()}) · ${Math.round(m.age)} days old\n\n${
    m.voc.isVoc ? `🚫 ${vocEndLabel(m.voc)}` : `✅ Applying ${m.voc.nextAspect}`
  }\n\nTropical: in ${m.zodiac} · Sidereal: in ${m.siderealZodiac} (Lahiri ${m.ayanamsa.toFixed(2)}°)\n\n**Mansion ${
    m.mansion.num
  } — ${m.mansion.name}**\n\n${m.mansion.theme}\n\n**Nakshatra ${m.nakshatra.n} — ${
    m.nakshatra.name
  }**\n\n${nakshatraTheme(m.nakshatra)} (${m.nakshatra.planet} · ${m.nakshatra.deity})\n\n**Xiu ${m.xiu.n} — ${
    m.xiu.name
  } ${m.xiu.zh} (approx)**\n\n${
    m.xiu.theme
  }\n\n| Planet | Tropical | Sidereal (Lahiri) | Motion |\n| --- | --- | --- | --- |\n${rows}`;
  const copyAll = `${m.phaseName} ${m.illumPct.toFixed(1)}% · Tropical ${m.zodiac} · Sidereal ${m.siderealZodiac} · ${
    m.voc.isVoc ? vocEndLabel(m.voc) : m.voc.nextAspect
  } · Mansion ${m.mansion.num} ${m.mansion.name} · Nakshatra ${m.nakshatra.name} · Xiu ${m.xiu.name}`;

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
          <Detail.Metadata.Label title="Phase" text={`${m.emoji} ${m.phaseName} · ${m.trend}`} />
          <Detail.Metadata.Label title="Illumination" text={`✨ ${m.illumPct.toFixed(1)}% · ${m.trend}`} />
          <Detail.Metadata.Label title="Moon age" text={`⏳ ${Math.round(m.age)} days`} />
          <Detail.Metadata.Label title="Tropical Moon" text={`${m.zodiac}`} />
          <Detail.Metadata.Label title="Sidereal Moon" text={`${m.siderealZodiac}`} />
          <Detail.Metadata.Label
            title="VOC"
            text={m.voc.isVoc ? `🚫 ${vocEndLabel(m.voc)}` : `✅ ${m.voc.nextAspect}`}
          />
          <Detail.Metadata.Label title="Ayanamsa (Lahiri)" text={`${m.ayanamsa.toFixed(3)}°`} />
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
            <Detail.Metadata.Label key={p.name} title={`${p.symbol} ${p.name}`} text={planetDetailLine(p)} />
          ))}
        </Detail.Metadata>
      }
    />
  );
}
