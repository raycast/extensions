import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  environment,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  launchCommand,
  openExtensionPreferences,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { SHADE_DOT, shadeOf, shadeOfWindow, type Shade } from "./core/business";
import { lookupExact } from "./core/dataset";
import { formatDate, formatDuration, formatWindow, renderTemplate, templateVars } from "./core/format";
import { parseExpression } from "./core/parse";
import { resolve } from "./core/resolve";
import { stripMarkdown } from "./core/strip";
import { addDays, wallParts, wallToInstant, zoneOffset } from "./core/time";
import type { Location, ZoneTarget } from "./core/types";
import { loadDataset, loadZones, zoneInfo } from "./lib/data";
import { currentZoneToken, formatExpression, zoneTokenFor } from "./lib/expression";
import { getPrefs, localZone } from "./lib/prefs";
import { useLocations } from "./lib/storage";
import { flag, locationCode, locationSubtitle, shadeIcon, shadeTextColor, SHADE_LABEL } from "./lib/ui";

type Row = {
  location: Location;
  transient: boolean;
  shade: Shade;
  text: string;
  abbr: string;
  offset: string;
  day: string;
  date: string;
};

const LOCAL_ID = "local";

/** Opens another command of this extension; Raycast refuses when it is disabled, which the toast explains. */
async function openCommand(name: string): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Could not open the command", message: String(e) });
  }
}

/** Left-pads with figure spaces (digit-width) so right-aligned accessory texts line up in columns. */
function padFigures(text: string, width: number): string {
  return "\u2007".repeat(Math.max(0, width - text.length)) + text;
}

/** Next (dir > 0) or previous (dir < 0) wall-clock multiple of `step` minutes in a zone, strictly past `instant`. */
function snapTo(instant: number, tz: string, step: number, dir: number): number {
  const w = wallParts(instant, tz);
  const minutes = w.h * 60 + w.min;
  const target = dir > 0 ? (Math.floor(minutes / step) + 1) * step : (Math.ceil(minutes / step) - 1) * step;
  return wallToInstant(
    tz,
    w.y,
    w.m,
    w.d + Math.floor(target / 1440),
    Math.floor((((target % 1440) + 1440) % 1440) / 60),
    ((target % 60) + 60) % 60,
  );
}

export default function Convert(props: LaunchProps<{ arguments: { expression?: string } }>) {
  const prefs = useMemo(getPrefs, []);
  const zones = useMemo(loadZones, []);
  const local = useMemo(localZone, []);
  const { file, locations, isLoading, save, error } = useLocations();
  useEffect(() => {
    if (error) void showToast({ style: Toast.Style.Failure, title: "Could not load locations", message: error });
  }, [error]);
  const [text, setText] = useState(props.arguments?.expression ?? "");
  const [dropdown, setDropdown] = useState<string>();
  const [showDetail, setShowDetail] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Default anchor for the dropdown, once the list is known.
  useEffect(() => {
    if (!file || dropdown !== undefined) return;
    const home = file.locations.find((l) => l.isHome);
    const last = file.lastAnchor && file.locations.find((l) => l.id === file.lastAnchor);
    const pick =
      prefs.defaultAnchor === "utc"
        ? (file.locations.find((l) => l.tz === "UTC")?.id ?? "utc")
        : prefs.defaultAnchor === "home" && home
          ? home.id
          : prefs.defaultAnchor === "last" && last
            ? last.id
            : LOCAL_ID;
    setDropdown(pick);
  }, [file, dropdown, prefs.defaultAnchor]);

  const configured = useMemo(() => locations ?? [], [locations]);
  const localRow: Location | undefined = useMemo(
    () =>
      prefs.showLocalRow && !configured.some((l) => l.tz === local)
        ? { id: LOCAL_ID, kind: "zone", label: "Local", tz: local, aliases: ["local", "here"] }
        : undefined,
    [configured, local, prefs.showLocalRow],
  );
  const known = useMemo(() => (localRow ? [...configured, localRow] : configured), [configured, localRow]);

  const fallback: ZoneTarget = useMemo(() => {
    const byId = known.find((l) => l.id === dropdown);
    if (byId) return { tz: byId.tz, label: byId.label, location: byId };
    if (dropdown === "utc")
      return {
        tz: "UTC",
        label: "UTC",
        transient: { id: "tz:UTC", kind: "zone", label: "UTC", tz: "UTC", aliases: ["utc"] },
      };
    const l = known.find((x) => x.tz === local);
    return l
      ? { tz: l.tz, label: l.label, location: l }
      : {
          tz: local,
          label: "Local",
          transient: { id: LOCAL_ID, kind: "zone", label: "Local", tz: local, aliases: [] },
        };
  }, [dropdown, known, local]);

  const parsed = useMemo(() => parseExpression(text), [text]);
  const resolved = useMemo(
    () =>
      resolve(parsed, {
        now,
        locations: known,
        zones,
        fallback,
        dateOrder: prefs.dateOrder,
        lookup: (q) => {
          const l = lookupExact(loadDataset(), q);
          return l ? { tz: l.tz, label: l.label, transient: l } : undefined;
        },
      }),
    [parsed, now, known, zones, fallback, prefs.dateOrder],
  );

  useEffect(() => {
    if (!resolved.live) return;
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, [resolved.live]);

  const anchorTz = resolved.anchor.tz;
  const rows: Row[] = useMemo(() => {
    const list: { location: Location; transient: boolean }[] = configured.map((l) => ({
      location: l,
      transient: false,
    }));
    if (localRow) list.push({ location: localRow, transient: true });
    const t = resolved.anchor.transient;
    // The Local row appears only when the preference allows it (and only once).
    const hideLocal = t?.id === LOCAL_ID && (localRow !== undefined || !prefs.showLocalRow);
    if (t && !hideLocal && !list.some((r) => r.location.id === t.id)) {
      list.push({ location: t, transient: true });
    }
    const indexed = list.map((r, i) => ({ ...r, i }));
    if (prefs.sortOrder !== "manual") {
      const dir = prefs.sortOrder === "offsetDesc" ? -1 : 1;
      indexed.sort(
        (a, b) =>
          dir * (zoneOffset(resolved.start, a.location.tz) - zoneOffset(resolved.start, b.location.tz)) || a.i - b.i,
      );
    }
    return indexed.map(({ location, transient }) => {
      const w = wallParts(resolved.start, location.tz);
      const startHour = w.h + w.min / 60;
      const biz = location.businessHours ?? prefs.business;
      const shade =
        resolved.end !== undefined
          ? shadeOfWindow(startHour, startHour + (resolved.end - resolved.start) / 3600000, biz, prefs.shoulder)
          : shadeOf(startHour, biz, prefs.shoulder);
      const v = templateVars({
        start: resolved.start,
        end: resolved.end,
        tz: location.tz,
        anchorTz,
        label: location.label,
        code: locationCode(location),
        abbrTable: zoneInfo(location.tz)?.abbr,
        fmt: prefs.timeFormat,
        shade,
      });
      return { location, transient, shade, text: v.time, abbr: v.abbr, offset: v.offset, day: v.day, date: v.date };
    });
  }, [configured, localRow, resolved, prefs, anchorTz]);

  const anchorText = formatWindow(resolved.start, resolved.end, anchorTz, prefs.timeFormat);
  const timeWidth = Math.max(...rows.map((r) => r.text.length), 0);
  const offsetWidth = Math.max(...rows.map((r) => r.offset.length), 0);
  const header = useMemo(() => {
    let h = `${formatDate(resolved.start, anchorTz)} · ${anchorText} ${resolved.anchor.label}`;
    if (resolved.end !== undefined) h += ` · ${formatDuration(resolved.end - resolved.start)}`;
    if (resolved.live) h += " · now";
    if (resolved.ambiguous.length) h += ` · or ${resolved.ambiguous.map((l) => l.label).join(" / ")}? type more`;
    if (resolved.errors.length) h += ` · ${resolved.errors.join(", ")}`;
    return h;
  }, [resolved, anchorTz, anchorText]);

  const anchorCopy = useMemo(() => {
    const l = resolved.anchor.location ?? resolved.anchor.transient;
    const anchorRow = rows.find((r) => r.location.id === l?.id);
    const v = templateVars({
      start: resolved.start,
      end: resolved.end,
      tz: anchorTz,
      anchorTz,
      label: resolved.anchor.label,
      code: l ? locationCode(l) : resolved.anchor.label,
      abbrTable: zoneInfo(anchorTz)?.abbr,
      fmt: prefs.timeFormat,
      shade: anchorRow?.shade,
    });
    return renderTemplate(prefs.copyTemplate, v);
  }, [resolved, rows, anchorTz, prefs]);

  const copyAll = useMemo(() => {
    const anchorId = resolved.anchor.location?.id ?? resolved.anchor.transient?.id;
    const items = rows
      .filter((r) => r.location.id !== anchorId)
      .map((r) =>
        renderTemplate(prefs.copyTemplate, {
          time: r.text,
          label: r.location.label,
          code: locationCode(r.location),
          abbr: r.abbr,
          date: r.date,
          day: r.day,
          offset: r.offset,
          tz: r.location.tz,
          dot: SHADE_DOT[r.shade],
        }),
      );
    return items.length ? `${anchorCopy} = ${items.join(prefs.copySeparator)}` : anchorCopy;
  }, [rows, anchorTz, anchorCopy, prefs]);

  const strip = useMemo(() => {
    if (!showDetail) return "";
    return stripMarkdown({
      dark: environment.appearance === "dark",
      start: resolved.start,
      end: resolved.end,
      anchorTz,
      fmt: prefs.timeFormat,
      colors: prefs.stripColors,
      rows: rows.map((r) => ({
        label: r.location.label,
        code: locationCode(r.location),
        abbr: r.abbr,
        tz: r.location.tz,
        business: r.location.businessHours ?? prefs.business,
        shoulder: prefs.shoulder,
        isAnchor: r.location.tz === anchorTz,
      })),
    });
  }, [showDetail, rows, resolved, anchorTz, prefs]);

  const copy = async (text: string) => {
    await Clipboard.copy(text);
    rememberAnchor();
    await showHUD("Copied to Clipboard", {
      popToRootType: prefs.popToRootAfterCopy ? PopToRootType.Immediate : PopToRootType.Default,
    });
  };

  /** Remembers the anchor for the "last used" default; a bookkeeping write, so no menu bar refresh and no wait. */
  const rememberAnchor = () => {
    if (
      prefs.defaultAnchor === "last" &&
      resolved.anchor.location &&
      !resolved.anchor.location.id.startsWith(LOCAL_ID)
    ) {
      void save({ lastAnchor: resolved.anchor.location.id }, { refreshMenuBar: false }).catch(() => undefined);
    }
  };

  const rewrite = (start: number, end: number | undefined, tz: string, zoneToken: string | undefined) => {
    setText(formatExpression({ start, end, tz, now: Date.now(), parsed, zoneToken }));
  };

  const nudge = (minutes: number) => {
    let start: number;
    if (resolved.live && Math.abs(minutes) < 24 * 60) {
      // From the live clock, snap to the next / previous full hour (or quarter hour) in the anchor zone.
      start = snapTo(resolved.start, anchorTz, Math.abs(minutes), Math.sign(minutes));
    } else if (minutes % (24 * 60) === 0) {
      start = addDays(resolved.start, anchorTz, minutes / (24 * 60));
    } else {
      start = resolved.start + minutes * 60000;
    }
    const end = resolved.end !== undefined ? resolved.end + (start - resolved.start) : undefined;
    rewrite(start, end, anchorTz, currentZoneToken(parsed, resolved));
  };

  const reanchor = (row: Row) => {
    const l = row.location;
    if (l.id === LOCAL_ID) {
      setDropdown(LOCAL_ID);
      rewrite(resolved.start, resolved.end, l.tz, undefined);
    } else {
      rewrite(resolved.start, resolved.end, l.tz, zoneTokenFor(l));
    }
  };

  const addLocation = async (l: Location) => {
    const added = { ...l, id: l.id === LOCAL_ID ? `tz:${l.tz}` : l.id };
    try {
      await save((f) => ({
        locations: f.locations.some((x) => x.id === added.id) ? f.locations : [...f.locations, added],
      }));
      await showToast({ style: Toast.Style.Success, title: `Added ${l.label}` });
    } catch {
      /* shown by save */
    }
  };

  const removeLocation = async (l: Location) => {
    try {
      await save((f) => ({ locations: f.locations.filter((x) => x.id !== l.id) }));
      await showToast({ style: Toast.Style.Success, title: `Removed ${l.label}` });
    } catch {
      /* shown by save */
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchText={text}
      onSearchTextChange={setText}
      filtering={false}
      searchBarPlaceholder="19-21 utc · tomorrow 9 sf · thu 17 et · lon"
      isShowingDetail={showDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Anchor zone used when you type no zone"
          value={dropdown ?? LOCAL_ID}
          onChange={(v) => {
            setDropdown(v);
            if (prefs.defaultAnchor === "last" && v !== LOCAL_ID && v !== "utc")
              void save({ lastAnchor: v }, { refreshMenuBar: false }).catch(() => undefined);
          }}
        >
          <List.Dropdown.Item title={`Local · ${local}`} value={LOCAL_ID} icon={Icon.Monitor} />
          {!configured.some((l) => l.tz === "UTC") && <List.Dropdown.Item title="UTC" value="utc" icon={Icon.Globe} />}
          <List.Dropdown.Section title="Locations">
            {configured.map((l) => (
              <List.Dropdown.Item key={l.id} title={l.label} value={l.id} icon={l.isHome ? Icon.House : Icon.Pin} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title={header}>
        {rows.map((row) => {
          const isAnchorRow = row.location.tz === anchorTz;
          // Right-aligned accessories share columns only when every row uses the same widths: pad the numeric
          // columns with figure spaces and keep the optional day tag leftmost so it never shifts the others.
          const accessories: List.Item.Accessory[] = [];
          if (row.day) accessories.push({ tag: { value: row.day, color: Color.Red }, tooltip: row.date });
          if (!showDetail && row.abbr) accessories.push({ tag: row.abbr, tooltip: row.location.tz });
          accessories.push({
            text: { value: padFigures(row.text, timeWidth), color: shadeTextColor(row.shade, prefs.colors) },
            tooltip: `${row.date} · ${SHADE_LABEL[row.shade]}`,
          });
          if (!showDetail)
            accessories.push({
              text: padFigures(row.offset, offsetWidth),
              tooltip: isAnchorRow ? "Anchor" : "Offset from the anchor zone",
            });
          const rowCopy = renderTemplate(prefs.copyTemplate, {
            time: row.text,
            label: row.location.label,
            code: locationCode(row.location),
            abbr: row.abbr,
            date: row.date,
            day: row.day,
            offset: row.offset,
            tz: row.location.tz,
            dot: SHADE_DOT[row.shade],
          });
          const copyAllAction = (
            <Action title="Copy All as One Line" icon={Icon.Clipboard} onAction={() => copy(copyAll)} />
          );
          const copyRowAction = (
            <Action title={`Copy ${row.location.label}`} icon={Icon.CopyClipboard} onAction={() => copy(rowCopy)} />
          );
          return (
            <List.Item
              key={row.location.id}
              icon={shadeIcon(row.shade, prefs.colors)}
              title={row.location.label}
              subtitle={
                showDetail
                  ? undefined
                  : `${flag(row.location.country)} ${row.transient && row.location.id !== LOCAL_ID ? "not in your list" : locationSubtitle(row.location)}${isAnchorRow ? " · anchor" : ""}`.trim()
              }
              accessories={accessories}
              detail={<List.Item.Detail markdown={strip} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {copyRowAction}
                    {copyAllAction}
                    <Action
                      title={`Re-Anchor on ${row.location.label}`}
                      icon={Icon.Pin}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                      onAction={() => reanchor(row)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Adjust">
                    <Action
                      title="Later by 1 Hour"
                      icon={Icon.ArrowRight}
                      shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                      onAction={() => nudge(60)}
                    />
                    <Action
                      title="Earlier by 1 Hour"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                      onAction={() => nudge(-60)}
                    />
                    <Action
                      title="Later by 15 Minutes"
                      icon={Icon.ArrowRight}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
                      onAction={() => nudge(15)}
                    />
                    <Action
                      title="Earlier by 15 Minutes"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
                      onAction={() => nudge(-15)}
                    />
                    <Action
                      title="Next Day"
                      icon={Icon.ArrowDown}
                      shortcut={Keyboard.Shortcut.Common.MoveDown}
                      onAction={() => nudge(24 * 60)}
                    />
                    <Action
                      title="Previous Day"
                      icon={Icon.ArrowUp}
                      shortcut={Keyboard.Shortcut.Common.MoveUp}
                      onAction={() => nudge(-24 * 60)}
                    />
                    <Action
                      title={showDetail ? "Hide Hour Strip" : "Show Hour Strip"}
                      icon={Icon.BarChart}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      onAction={() => setShowDetail((v) => !v)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Locations">
                    {row.transient ? (
                      <Action title="Add to Locations" icon={Icon.Plus} onAction={() => addLocation(row.location)} />
                    ) : (
                      <Action
                        title="Remove Location"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => removeLocation(row.location)}
                      />
                    )}
                    <Action
                      title="Manage Locations"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                      onAction={() => openCommand("manage-locations")}
                    />
                    <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {!isLoading && rows.length === 0 && (
        <List.EmptyView
          title={error ? "Could not load locations" : "No locations yet"}
          description={error ?? "Add cities or time zones with Manage Locations"}
          actions={
            <ActionPanel>
              <Action title="Manage Locations" icon={Icon.List} onAction={() => openCommand("manage-locations")} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
