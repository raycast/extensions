import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { Row, Section, Unit, formatLength, search } from "./search";

type UnitPref = "native" | "in" | "mm";

const key = (k: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut => ({
  macOS: { modifiers: shift ? ["cmd", "shift"] : ["cmd"], key: k },
  Windows: { modifiers: shift ? ["ctrl", "shift"] : ["ctrl"], key: k },
});

const SHORTCUTS = {
  calculator: key("="),
  copyAlt: Keyboard.Shortcut.Common.Copy,
  copyWithUnit: key("u", true),
  copyDrill: key("d", true),
  copySheet: key("s", true),
  toggleDetail: key("i"),
};

const SECTION_META: Record<Section, { icon: Icon; color: Color; standard: { imperial: string; metric: string } }> = {
  "Tap Drill": {
    icon: Icon.CircleFilled,
    color: Color.Blue,
    standard: { imperial: "75% thread", metric: "ISO 261" },
  },
  "Clearance Hole": {
    icon: Icon.Circle,
    color: Color.Green,
    standard: { imperial: "ASME B18.2.8", metric: "ISO 273" },
  },
  Counterbore: {
    icon: Icon.CircleProgress100,
    color: Color.Orange,
    standard: { imperial: "ASME B18.3 SHCS", metric: "ISO 4762 SHCS" },
  },
  Thread: {
    icon: Icon.Ruler,
    color: Color.Purple,
    standard: { imperial: "UN basic", metric: "ISO basic" },
  },
};

interface Display {
  value: number;
  unit: Unit;
  altValue: number;
  altUnit: Unit;
}

function display(row: Row, pref: UnitPref): Display {
  if (pref === "native" || pref === row.unit) return row;
  return { value: row.altValue, unit: row.altUnit, altValue: row.value, altUnit: row.unit };
}

function subtitleFor(row: Row): string {
  const parts: string[] = [];
  if (row.fastener !== row.size) parts.push(row.fastener);
  if (row.label !== "Tap Drill") parts.push(row.label);
  if (row.drill) parts.push(`${row.drill} drill`);
  return parts.join(" · ");
}

// Full sheet for a size regardless of the current filter, so "cbore 1/4" still copies all of 1/4
function specSheet(size: string): string {
  const mine = search(size).filter((r) => r.size === size);
  if (mine.length === 0) return "";
  const lines = [`## ${size}`, "", "| Item | in | mm |", "|---|---|---|"];
  for (const r of mine) {
    const inches = r.unit === "in" ? r.value : r.altValue;
    const mm = r.unit === "mm" ? r.value : r.altValue;
    const name = r.fastener === r.size ? r.label : `${r.fastener} ${r.label === "Tap Drill" ? "tap" : r.label}`;
    const drill = r.drill ? ` (${r.drill})` : "";
    lines.push(`| ${r.section}: ${name} | ${formatLength(inches, "in")}${drill} | ${formatLength(mm, "mm")} |`);
  }
  return lines.join("\n");
}

// "#10 Close Fit", "#10-24 UNC Tap Drill", "M6 Counterbore Depth"
function describe(row: Row): string {
  if (row.section === "Tap Drill") return `${row.fastener} Tap Drill`;
  if (row.fastener !== row.size) return `${row.fastener} ${row.label}`;
  if (row.section === "Counterbore" && (row.label === "Diameter" || row.label === "Depth")) {
    return `${row.size} Counterbore ${row.label}`;
  }
  return `${row.size} ${row.label}`;
}

function CopyAction(props: { title: string; content: string; hud: string; icon?: Icon; shortcut?: Keyboard.Shortcut }) {
  return (
    <Action
      title={props.title}
      icon={props.icon ?? Icon.Clipboard}
      shortcut={props.shortcut}
      onAction={async () => {
        await Clipboard.copy(props.content);
        await showHUD(`Copied ${props.hud}`);
      }}
    />
  );
}

function groupKey(row: Row) {
  return `${row.size}|${row.section}`;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [unitPref, setUnitPref] = useCachedState<UnitPref>("unit-pref", "native");
  const [showDetail, setShowDetail] = useCachedState<boolean>("show-detail", false);

  const rows = useMemo(() => search(query), [query]);

  const groups = useMemo(() => {
    const out: { key: string; size: string; section: Section; system: Row["system"]; rows: Row[] }[] = [];
    for (const r of rows) {
      const key = groupKey(r);
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(r);
      else out.push({ key, size: r.size, section: r.section, system: r.system, rows: [r] });
    }
    return out;
  }, [rows]);

  const isDefaultChart = query.trim() === "";

  return (
    <List
      searchBarPlaceholder="#10, 1/4-20, M6, m8 fine, cbore 3/8, clearance for #10, .25 …"
      onSearchTextChange={setQuery}
      filtering={false}
      isShowingDetail={showDetail && !isDefaultChart}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Display units" value={unitPref} onChange={(v) => setUnitPref(v as UnitPref)}>
          <List.Dropdown.Item title="Native units" value="native" />
          <List.Dropdown.Item title="Inches" value="in" />
          <List.Dropdown.Item title="Millimeters" value="mm" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No fastener matched"
        description={
          "Try: #10 · 10-32 · 1/4-20 · .375 · M6 · m8 fine · m10 x 1.25\ntap 3/8 · clearance for #10 · m6 close · cbore 1/4"
        }
      />
      {groups.map((g) => {
        const meta = SECTION_META[g.section];
        const standard = meta.standard[g.system];
        return (
          <List.Section key={g.key} title={`${g.size} · ${g.section}`} subtitle={standard}>
            {g.rows.map((r) => {
              const d = display(r, unitPref);
              const primary = formatLength(d.value, d.unit);
              const alt = formatLength(d.altValue, d.altUnit);
              const sheet = specSheet(r.size);
              const what = describe(r);
              return (
                <List.Item
                  key={r.id}
                  icon={{ source: meta.icon, tintColor: meta.color }}
                  title={`${primary} ${d.unit}`}
                  subtitle={subtitleFor(r)}
                  accessories={[
                    ...(r.note ? [{ icon: Icon.Info, tooltip: r.note }] : []),
                    { text: `${alt} ${d.altUnit}`, tooltip: "Converted" },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={sheet}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Size" text={r.size} />
                          <List.Item.Detail.Metadata.Label title="Spec" text={r.fastener} />
                          <List.Item.Detail.Metadata.Label title={r.label} text={`${primary} ${d.unit}`} />
                          <List.Item.Detail.Metadata.Label title="Converted" text={`${alt} ${d.altUnit}`} />
                          {r.drill ? <List.Item.Detail.Metadata.Label title="Drill" text={r.drill} /> : null}
                          {r.note ? <List.Item.Detail.Metadata.Label title="Note" text={r.note} /> : null}
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Standard" text={standard} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title={`${r.size} ${r.label}`}>
                        <CopyAction
                          title={`Copy ${primary}`}
                          content={primary}
                          hud={`${what} · ${primary} ${d.unit}`}
                        />
                        <Action.Paste
                          title={`Paste ${primary} into Active App`}
                          content={primary}
                          icon={Icon.TextCursor}
                        />
                        <Action
                          title={`Copy ${primary} and Return to Calculator`}
                          icon={Icon.Calculator}
                          shortcut={SHORTCUTS.calculator}
                          onAction={async () => {
                            await Clipboard.copy(primary);
                            await popToRoot({ clearSearchBar: true });
                            await showToast({
                              style: Toast.Style.Success,
                              title: `${primary} copied`,
                              message: "Paste here and keep typing to calculate",
                            });
                          }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Variants">
                        <CopyAction
                          title={`Copy ${alt} ${d.altUnit}`}
                          content={alt}
                          hud={`${what} · ${alt} ${d.altUnit}`}
                          icon={Icon.Switch}
                          shortcut={SHORTCUTS.copyAlt}
                        />
                        <CopyAction
                          title={`Copy with Unit (${primary} ${d.unit})`}
                          content={`${primary} ${d.unit}`}
                          hud={`${what} · ${primary} ${d.unit}`}
                          shortcut={SHORTCUTS.copyWithUnit}
                        />
                        {r.drill ? (
                          <CopyAction
                            title={`Copy Drill Name (${r.drill})`}
                            content={r.drill}
                            hud={`${what} · ${r.drill} drill`}
                            shortcut={SHORTCUTS.copyDrill}
                          />
                        ) : null}
                        <CopyAction
                          title={`Copy ${r.size} Spec Sheet (Markdown)`}
                          content={sheet}
                          hud={`${r.size} spec sheet`}
                          icon={Icon.Document}
                          shortcut={SHORTCUTS.copySheet}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="View">
                        <Action
                          title={showDetail ? "Hide Spec Sheet" : "Show Spec Sheet"}
                          icon={Icon.Sidebar}
                          shortcut={SHORTCUTS.toggleDetail}
                          onAction={() => setShowDetail(!showDetail)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
