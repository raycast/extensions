import { Clipboard, MenuBarExtra } from "@raycast/api";
import { getMoonInfo } from "./moon";

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
      title={`${m.emoji} ${m.illumPct.toFixed(0)}%`}
      tooltip={`${m.phaseName} · ${m.illumPct.toFixed(1)}% in ${m.zodiac}`}
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
          title={m.phaseName}
          subtitle="Phase"
          onAction={copy(`${m.phaseName} ${m.illumPct.toFixed(1)}% in ${m.zodiac}`)}
        />
        <MenuBarExtra.Item
          icon="✨"
          title={`${m.illumPct.toFixed(1)}%`}
          subtitle="Illumination"
          onAction={copy(`${m.illumPct.toFixed(1)}%`)}
        />
        <MenuBarExtra.Item
          icon="⏳"
          title={`${Math.round(m.age)} days`}
          subtitle="Age"
          onAction={copy(`${Math.round(m.age)} days`)}
        />
        <MenuBarExtra.Item icon={SYMBOL[m.zodiac]} title={m.zodiac} subtitle="Zodiac" onAction={copy(m.zodiac)} />
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
        <MenuBarExtra.Item icon="💭" title={m.mansion.theme} onAction={copy(m.mansion.theme)} />
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
        <MenuBarExtra.Item icon="💭" title={m.nakshatra.theme} onAction={copy(m.nakshatra.theme)} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Chinese lodge (approx)">
        <MenuBarExtra.Item
          icon="🐉"
          title={`${m.xiu.name} ${m.xiu.zh}`}
          subtitle={`Lodge ${m.xiu.n}`}
          onAction={copy(`Xiu ${m.xiu.n} ${m.xiu.name} ${m.xiu.zh} (${m.xiu.group})`)}
        />
        <MenuBarExtra.Item icon="🏯" title={m.xiu.group} subtitle="Palace" onAction={copy(m.xiu.group)} />
        <MenuBarExtra.Item icon="💭" title={m.xiu.theme} onAction={copy(m.xiu.theme)} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Planets">
        {m.planets.map((p) => (
          <MenuBarExtra.Item
            key={p.name}
            icon={p.symbol}
            title={`${p.deg} ${p.sign}`}
            subtitle={`${p.name} · ${p.motion}`}
            onAction={copy(`${p.name} ${p.deg} ${p.sign} ${p.motion}`)}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
