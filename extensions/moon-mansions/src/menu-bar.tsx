import { Clipboard, MenuBarExtra } from "@raycast/api";
import { getMoonInfo, nakshatraTheme, planetMenuTitle, splitTwoLines, vocEndLabel } from "./moon";

const SYMBOL: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export default function Command() {
  const m = getMoonInfo();
  const copy = (text: string) => async () => {
    await Clipboard.copy(text);
  };

  return (
    <MenuBarExtra
      title={`${m.emoji} ${m.illumPct.toFixed(0)}%${m.voc.isVoc ? " VOC" : ""}`}
      tooltip={`${m.phaseName} · ${m.trend} · ${m.illumPct.toFixed(1)}% in ${m.zodiac}${
        m.voc.isVoc ? ` · ${vocEndLabel(m.voc)}` : ""
      }`}
    >
      <MenuBarExtra.Section title="Calendars">
        <MenuBarExtra.Item icon="🕌" title={m.cal.hijri} subtitle="Hijri" onAction={copy(m.cal.hijri)} />
        <MenuBarExtra.Item
          icon={m.cal.cnDayEmoji}
          title={m.cal.cnDay}
          subtitle={m.cal.cnDaySub}
          onAction={copy(`${m.cal.cnDay} (${m.cal.cnDaySub})`)}
        />
        <MenuBarExtra.Item
          icon={m.cal.cnMonthEmoji}
          title={m.cal.cnMonth}
          subtitle={m.cal.cnMonthSub}
          onAction={copy(`${m.cal.cnMonth} (${m.cal.cnMonthSub})`)}
        />
        <MenuBarExtra.Item icon="🕉️" title={m.cal.tithi} subtitle="Tithi" onAction={copy(m.cal.tithi)} />
        <MenuBarExtra.Item icon="🌙" title={m.cal.masa} subtitle="Masa" onAction={copy(m.cal.masa)} />
        <MenuBarExtra.Item icon="⭐" title={m.cal.vara} subtitle="Vara" onAction={copy(m.cal.vara)} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Moon">
        <MenuBarExtra.Item
          icon={m.emoji}
          title={`${m.phaseName} · ${m.trend}`}
          subtitle="Phase"
          onAction={copy(`${m.phaseName} (${m.trend.toLowerCase()}) ${m.illumPct.toFixed(1)}% in ${m.zodiac}`)}
        />
        <MenuBarExtra.Item
          icon="✨"
          title={`${m.illumPct.toFixed(1)}% · ${m.trend}`}
          subtitle="Illumination"
          onAction={copy(`${m.illumPct.toFixed(1)}% ${m.trend.toLowerCase()}`)}
        />
        <MenuBarExtra.Item
          icon="⏳"
          title={`${Math.round(m.age)} days`}
          subtitle="Age"
          onAction={copy(`${Math.round(m.age)} days`)}
        />
        <MenuBarExtra.Item
          icon={SYMBOL[m.zodiac]}
          title={m.zodiac}
          subtitle="Zodiac (Tropical)"
          onAction={copy(m.zodiac)}
        />
        <MenuBarExtra.Item
          icon={SYMBOL[m.siderealZodiac]}
          title={m.siderealZodiac}
          subtitle="Zodiac (Sidereal Lahiri)"
          onAction={copy(m.siderealZodiac)}
        />
        <MenuBarExtra.Item
          icon="📐"
          title={`${m.ayanamsa.toFixed(3)}°`}
          subtitle="Ayanamsa"
          onAction={copy(`${m.ayanamsa.toFixed(3)}°`)}
        />
        <MenuBarExtra.Item
          icon={m.voc.isVoc ? "🚫" : "✅"}
          title={m.voc.isVoc ? vocEndLabel(m.voc) : `Applying: ${m.voc.nextAspect}`}
          subtitle="VOC"
          onAction={copy(m.voc.isVoc ? vocEndLabel(m.voc) : `Moon applying: ${m.voc.nextAspect}`)}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Arab mansion">
        <MenuBarExtra.Item
          icon="🔢"
          title={String(m.mansion.num)}
          subtitle="Number"
          onAction={copy(String(m.mansion.num))}
        />
        <MenuBarExtra.Item icon="🏷️" title={m.mansion.name} subtitle="Mansion" onAction={copy(m.mansion.name)} />
        <MenuBarExtra.Item
          icon="🤲"
          title={m.mansion.divineName}
          subtitle="Divine Name"
          onAction={copy(m.mansion.divineName)}
        />
        <MenuBarExtra.Item icon="📐" title={m.mansion.deg} subtitle="Degrees" onAction={copy(m.mansion.deg)} />
        {splitTwoLines(m.mansion.theme).map((line, i) => (
          <MenuBarExtra.Item key={`mansion-theme-${i}`} icon="💭" title={line} onAction={copy(m.mansion.theme)} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Vedic nakshatra">
        <MenuBarExtra.Item
          icon="🕉️"
          title={m.nakshatra.name}
          subtitle={`Nakshatra ${m.nakshatra.n}`}
          onAction={copy(
            `Nakshatra ${m.nakshatra.n} ${m.nakshatra.name} (${m.nakshatra.planet}, ${m.nakshatra.deity})`
          )}
        />
        <MenuBarExtra.Item
          icon="🪐"
          title={`${m.nakshatra.planet} · ${m.nakshatra.deity}`}
          subtitle="Rulers"
          onAction={copy(`${m.nakshatra.planet}, ${m.nakshatra.deity}`)}
        />
        {splitTwoLines(nakshatraTheme(m.nakshatra)).map((line, i) => (
          <MenuBarExtra.Item
            key={`nakshatra-theme-${i}`}
            icon="💭"
            title={line}
            onAction={copy(nakshatraTheme(m.nakshatra))}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Chinese lodge (approx)">
        <MenuBarExtra.Item
          icon="🐉"
          title={`${m.xiu.name} ${m.xiu.zh}`}
          subtitle={`Lodge ${m.xiu.n}`}
          onAction={copy(`Xiu ${m.xiu.n} ${m.xiu.name} ${m.xiu.zh} (${m.xiu.group})`)}
        />
        <MenuBarExtra.Item icon="🏯" title={m.xiu.group} subtitle="Palace" onAction={copy(m.xiu.group)} />
        {splitTwoLines(m.xiu.theme).map((line, i) => (
          <MenuBarExtra.Item key={`xiu-theme-${i}`} icon="💭" title={line} onAction={copy(m.xiu.theme)} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Planets — Tropical · Sidereal">
        {m.planets.map((p) => (
          <MenuBarExtra.Item
            key={p.name}
            icon={p.symbol}
            title={planetMenuTitle(p)}
            subtitle={p.motion}
            onAction={copy(
              `${p.name}  Tropical ${p.deg} ${p.sign}  ·  Sidereal ${p.sidDeg} ${p.sidSign}  ·  ${p.motion}`
            )}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
