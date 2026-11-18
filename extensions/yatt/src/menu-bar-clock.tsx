import { Clipboard, Icon, launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useMemo } from "react";
import { shadeOf } from "./core/business";
import { formatDateLong, renderTemplate, templateVars } from "./core/format";
import { wallParts, zoneOffset } from "./core/time";
import type { Location } from "./core/types";
import { zoneInfo } from "./lib/data";
import { getPrefs, localZone } from "./lib/prefs";
import { useLocations } from "./lib/storage";
import { locationCode, shadeColor, SHADE_LABEL } from "./lib/ui";

export default function MenuBar() {
  const prefs = useMemo(getPrefs, []);
  const local = localZone();
  const { locations, isLoading, error } = useLocations();
  const now = Date.now();
  const dir = prefs.sortOrder === "offsetDesc" ? -1 : 1;
  const list =
    prefs.sortOrder === "manual"
      ? [...(locations ?? [])]
      : [...(locations ?? [])].sort((a, b) => dir * (zoneOffset(now, a.tz) - zoneOffset(now, b.tz)));

  const shadeFor = (l: Location) => {
    const w = wallParts(now, l.tz);
    return shadeOf(w.h + w.min / 60, l.businessHours ?? prefs.business, prefs.shoulder);
  };
  const vars = (l: Location) =>
    templateVars({
      start: now,
      tz: l.tz,
      anchorTz: local,
      label: l.label,
      code: locationCode(l),
      abbrTable: zoneInfo(l.tz)?.abbr,
      fmt: prefs.timeFormat,
      shade: shadeFor(l),
    });

  const flagged = list.filter((l) => l.menuBar?.show);
  const title = flagged
    .map((l) => renderTemplate(l.menuBar?.format?.trim() || prefs.menuBarTemplate, vars(l)))
    .join(prefs.menuBarSeparator);

  return (
    <MenuBarExtra
      icon={prefs.menuBarIcon || !title ? Icon.Clock : undefined}
      title={title}
      tooltip="Time Zones"
      isLoading={isLoading}
    >
      {error && <MenuBarExtra.Item title="Could not load locations" subtitle={error} icon={Icon.Warning} />}
      <MenuBarExtra.Section title={formatDateLong(now, local)}>
        {list.map((l) => {
          const v = vars(l);
          const shade = shadeFor(l);
          return (
            <MenuBarExtra.Item
              key={l.id}
              icon={{ source: Icon.CircleFilled, tintColor: shadeColor(shade, prefs.colors) }}
              title={`${v.time}  ${l.label}`}
              subtitle={[v.abbr, v.day].filter(Boolean).join(" ")}
              tooltip={`${v.date} · ${v.offset} from local · ${SHADE_LABEL[shade]} · click to copy`}
              onAction={() => Clipboard.copy(renderTemplate(prefs.copyTemplate, v))}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Convert Time"
          icon={Icon.Clock}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => launchCommand({ name: "convert", type: LaunchType.UserInitiated }).catch(() => undefined)}
        />
        <MenuBarExtra.Item
          title="Manage Locations"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={() =>
            launchCommand({ name: "manage-locations", type: LaunchType.UserInitiated }).catch(() => undefined)
          }
        />
        <MenuBarExtra.Item title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
