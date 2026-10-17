import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { lstat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SettingChoice } from "./core-settings";
import { hotkeyCommandTitle, hotkeyTokens, type HotkeyBinding } from "./hotkey-display";
import type { VaultItem } from "./items";

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function shorten(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit - 1) + "…" : value;
}

export async function writeSvg(folderName: string, key: string, svg: string): Promise<string> {
  const folder = path.join(environment.supportPath, folderName);
  await mkdir(folder, { recursive: true });
  const name = createHash("sha256").update(key).digest("hex") + ".svg";
  const filePath = path.join(folder, name);
  await writeFile(filePath, svg);
  return filePath;
}

function keycaps(binding: HotkeyBinding, x: number, y: number, maxWidth: number, color: string): string {
  let cursor = x;
  const pieces: string[] = [];
  for (const token of hotkeyTokens(binding)) {
    const label = shorten(token.replace(/\s+/g, " "), 9);
    const width = Math.max(29, Math.min(78, 14 + label.length * 9));
    if (cursor + width > x + maxWidth) {
      pieces.push(
        `<text x="${x + maxWidth - 12}" y="${y + 21}" fill="${color}" font-family="system-ui" font-size="16">…</text>`,
      );
      break;
    }
    pieces.push(
      `<rect x="${cursor}" y="${y}" width="${width}" height="29" rx="7" fill="#3a444e" stroke="${color}" stroke-opacity="0.55"/>` +
        `<text x="${cursor + width / 2}" y="${y + 20}" text-anchor="middle" fill="#f5f7fa" font-family="system-ui" font-size="14" font-weight="650">${xml(label)}</text>`,
    );
    cursor += width + 6;
  }
  return pieces.join("");
}

/** Full visual for one hotkey command in the individual settings list. */
export async function hotkeyChoiceVisual(
  choice: SettingChoice,
  linked: boolean,
  defaultVault: string,
  targetVault: string,
): Promise<string> {
  const status = choice.different ? "DIFFERENT SHORTCUTS" : linked ? "SHARED SHORTCUTS" : "MATCHING SHORTCUTS";
  const color = choice.different ? "#f3b96f" : linked ? "#74d6a0" : "#79bbf3";
  const count = Math.max(choice.defaultHotkeys?.length ?? 0, linked ? 0 : (choice.targetHotkeys?.length ?? 0), 1);
  const panelHeight = Math.max(130, 72 + count * 43);
  const height = 104 + panelHeight + 42;
  const side = (
    label: string,
    bindings: HotkeyBinding[] | null | undefined,
    present: boolean,
    x: number,
    width: number,
  ) => {
    const lines = !present
      ? `<text x="${x + 20}" y="181" fill="#9da9b8" font-family="system-ui" font-size="15">Not set</text>`
      : !bindings
        ? `<text x="${x + 20}" y="181" fill="#f3b96f" font-family="system-ui" font-size="15">Shortcut format unavailable</text>`
        : bindings.length === 0
          ? `<text x="${x + 20}" y="181" fill="#9da9b8" font-family="system-ui" font-size="15">No shortcuts assigned</text>`
          : bindings.map((binding, index) => keycaps(binding, x + 20, 158 + index * 43, width - 40, color)).join("");
    return (
      `<rect x="${x}" y="104" width="${width}" height="${panelHeight}" rx="16" fill="#2b3038" stroke="#46505b"/>` +
      `<text x="${x + 20}" y="132" fill="${color}" font-family="system-ui" font-size="12" font-weight="700">${xml(label)}</text>` +
      lines
    );
  };
  const body = linked
    ? side("SHARED BY DEFAULT AND THIS VAULT", choice.defaultHotkeys, choice.inDefault, 24, 712)
    : side(`DEFAULT · ${shorten(path.basename(defaultVault), 20)}`, choice.defaultHotkeys, choice.inDefault, 24, 348) +
      side(`THIS VAULT · ${shorten(path.basename(targetVault), 20)}`, choice.targetHotkeys, choice.inTarget, 388, 348);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}">` +
    `<rect width="760" height="${height}" rx="18" fill="#20242a"/>` +
    `<text x="26" y="40" fill="#f5f7fa" font-family="system-ui" font-size="23" font-weight="700">${xml(shorten(hotkeyCommandTitle(choice.label), 38))}</text>` +
    `<text x="26" y="67" fill="#9da9b8" font-family="ui-monospace, monospace" font-size="12">${xml(shorten(choice.label, 65))}</text>` +
    `<text x="734" y="89" text-anchor="end" fill="${color}" font-family="system-ui" font-size="12" font-weight="700">${status}</text>` +
    body +
    `<text x="26" y="${height - 15}" fill="#aeb8c5" font-family="system-ui" font-size="12">${linked ? "Changes to this shortcut are shared immediately." : "Select an action to copy one vault's shortcut to the other."}</text>` +
    `</svg>`;
  return writeSvg(
    "settings-hotkey-previews",
    JSON.stringify({ version: 2, choice, linked, defaultVault, targetVault }),
    svg,
  );
}

/** Compact comparison for the Core Settings list detail pane. */
export async function settingsGroupVisual(
  title: string,
  file: string,
  entries: SettingChoice[],
  state: VaultItem["state"] | undefined,
  problem: string | undefined,
  defaultVault: string,
  targetVault: string,
): Promise<string> {
  const linked = state === "linked";
  const unsafe = state === "broken" || state === "foreign-link";
  const issue = unsafe ? (problem ?? "This link needs review before its settings can be compared.") : problem;
  const accent = issue ? "#f28c91" : linked ? "#74d6a0" : "#79bbf3";
  const mode = issue
    ? "NEEDS REVIEW"
    : linked
      ? "LIVE LINK"
      : state === "available"
        ? "MISSING HERE"
        : state === "native-unique"
          ? "TARGET ONLY"
          : "LOCAL FILE";
  const same = entries.filter((entry) => !entry.different).length;
  const different = entries.length - same;
  const clean = (value: string, limit: number) =>
    xml(
      shorten(
        Array.from(value, (char) => {
          const code = char.codePointAt(0) ?? 0;
          return code < 32 || code === 127 ? " " : char;
        })
          .join("")
          .replace(/\s+/g, " ")
          .trim(),
        limit,
      ),
    );
  const hotkeyPreview = (
    bindings: HotkeyBinding[] | null | undefined,
    present: boolean,
    x: number,
    y: number,
    width: number,
    color: string,
  ): string => {
    if (!present)
      return `<text x="${x}" y="${y + 20}" fill="#9da9b8" font-family="system-ui" font-size="12">Not set</text>`;
    if (!bindings)
      return `<text x="${x}" y="${y + 20}" fill="#f3b96f" font-family="system-ui" font-size="11">Unknown format</text>`;
    if (bindings.length === 0)
      return `<text x="${x}" y="${y + 20}" fill="#9da9b8" font-family="system-ui" font-size="12">No shortcuts</text>`;
    return (
      keycaps(bindings[0], x, y, width, color) +
      (bindings.length > 1
        ? `<text x="${x}" y="${y + 43}" fill="#aeb8c5" font-family="system-ui" font-size="10">+ ${bindings.length - 1} more</text>`
        : "")
    );
  };
  const settingCard = (entry: SettingChoice, index: number): string => {
    const x = index % 2 === 0 ? 24 : 388;
    const y = 288 + Math.floor(index / 2) * 116;
    const status = entry.different ? "DIFFERENT" : linked ? "SHARED" : "MATCHING";
    const color = entry.different ? "#f3b96f" : linked ? "#74d6a0" : "#79bbf3";
    const source = entry.inDefault ? clean(entry.defaultValue, 18) : "Not set";
    const target = entry.inTarget ? clean(entry.targetValue, 18) : "Not set";
    if (file === "hotkeys.json") {
      const shortcuts = linked
        ? `<text x="${x + 16}" y="${y + 49}" fill="#9da9b8" font-family="system-ui" font-size="10" font-weight="700">SHARED SHORTCUT</text>` +
          hotkeyPreview(entry.defaultHotkeys, entry.inDefault, x + 16, y + 58, 310, color)
        : `<text x="${x + 16}" y="${y + 49}" fill="#9da9b8" font-family="system-ui" font-size="10" font-weight="700">DEFAULT</text>` +
          `<text x="${x + 178}" y="${y + 49}" fill="#9da9b8" font-family="system-ui" font-size="10" font-weight="700">THIS VAULT</text>` +
          hotkeyPreview(entry.defaultHotkeys, entry.inDefault, x + 16, y + 58, 152, color) +
          hotkeyPreview(entry.targetHotkeys, entry.inTarget, x + 178, y + 58, 152, color);
      return (
        `<rect x="${x}" y="${y}" width="348" height="104" rx="14" fill="#2b3038" stroke="#46505b"/>` +
        `<rect x="${x}" y="${y}" width="5" height="104" rx="2" fill="${color}"/>` +
        `<text x="${x + 16}" y="${y + 25}" fill="#f5f7fa" font-family="system-ui" font-size="15" font-weight="650">${clean(hotkeyCommandTitle(entry.label), 28)}</text>` +
        `<text x="${x + 332}" y="${y + 24}" text-anchor="end" fill="${color}" font-family="system-ui" font-size="10" font-weight="700">${status}</text>` +
        shortcuts
      );
    }
    return (
      `<rect x="${x}" y="${y}" width="348" height="104" rx="14" fill="#2b3038" stroke="#46505b"/>` +
      `<rect x="${x}" y="${y}" width="5" height="104" rx="2" fill="${color}"/>` +
      `<text x="${x + 16}" y="${y + 25}" fill="#f5f7fa" font-family="system-ui" font-size="15" font-weight="650">${clean(entry.label, 24)}</text>` +
      `<text x="${x + 332}" y="${y + 24}" text-anchor="end" fill="${color}" font-family="system-ui" font-size="10" font-weight="700">${status}</text>` +
      `<text x="${x + 16}" y="${y + 49}" fill="#9da9b8" font-family="system-ui" font-size="10" font-weight="700">DEFAULT</text>` +
      `<text x="${x + 178}" y="${y + 49}" fill="#9da9b8" font-family="system-ui" font-size="10" font-weight="700">THIS VAULT</text>` +
      `<text x="${x + 16}" y="${y + 77}" fill="#e8edf3" font-family="ui-monospace, monospace" font-size="13">${source}</text>` +
      `<text x="${x + 178}" y="${y + 77}" fill="#e8edf3" font-family="ui-monospace, monospace" font-size="13">${target}</text>`
    );
  };
  const cards = issue
    ? `<rect x="24" y="288" width="712" height="220" rx="16" fill="#342b30" stroke="#77525b"/>` +
      `<text x="44" y="324" fill="#f28c91" font-family="system-ui" font-size="17" font-weight="700">Settings need attention</text>` +
      `<text x="44" y="354" fill="#d8c7cb" font-family="system-ui" font-size="13">${clean(issue, 85)}</text>` +
      `<text x="44" y="484" fill="#aeb8c5" font-family="system-ui" font-size="12">Review the file before changing individual settings.</text>`
    : entries.length
      ? [...entries]
          .sort((left, right) => Number(right.different) - Number(left.different))
          .slice(0, 4)
          .map(settingCard)
          .join("")
      : `<rect x="24" y="288" width="712" height="220" rx="16" fill="#2b3038" stroke="#46505b"/>` +
        `<text x="380" y="403" text-anchor="middle" fill="#aeb8c5" font-family="system-ui" font-size="15">No individual settings found in this group.</text>`;
  const note = issue
    ? "The settings comparison is unavailable until this file is reviewed."
    : file === "appearance.json"
      ? linked
        ? "Enabled CSS snippets are shared across linked vaults."
        : "Enabled CSS snippets stay specific to this vault."
      : linked
        ? "Changes from either vault affect the same file."
        : "This vault has its own settings file.";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="554" viewBox="0 0 760 554">` +
    `<rect width="760" height="554" rx="18" fill="#20242a"/>` +
    `<text x="26" y="42" fill="#f5f7fa" font-family="system-ui" font-size="26" font-weight="700">${clean(title, 28)}</text>` +
    `<text x="734" y="40" text-anchor="end" fill="#9da9b8" font-family="ui-monospace, monospace" font-size="13">${clean(file, 25)}</text>` +
    `<rect x="24" y="68" width="712" height="112" rx="16" fill="#2b3038" stroke="#46505b"/>` +
    `<text x="44" y="92" fill="#b6a4f5" font-family="system-ui" font-size="11" font-weight="700">DEFAULT VAULT</text>` +
    `<text x="44" y="120" fill="#f5f7fa" font-family="system-ui" font-size="17" font-weight="600">${clean(path.basename(defaultVault), 25)}</text>` +
    `<text x="716" y="92" text-anchor="end" fill="#77c7ea" font-family="system-ui" font-size="11" font-weight="700">THIS VAULT</text>` +
    `<text x="716" y="120" text-anchor="end" fill="#f5f7fa" font-family="system-ui" font-size="17" font-weight="600">${clean(path.basename(targetVault), 25)}</text>` +
    `<path d="M286 117 H474" stroke="${accent}" stroke-width="3" ${linked ? "" : 'stroke-dasharray="6 7"'} />` +
    `<rect x="316" y="137" width="128" height="27" rx="13" fill="#384149"/>` +
    `<text x="380" y="155" text-anchor="middle" fill="${accent}" font-family="system-ui" font-size="11" font-weight="700">${mode}</text>` +
    `<text x="26" y="213" fill="#aeb8c5" font-family="system-ui" font-size="13">${clean(note, 85)}</text>` +
    `<text x="26" y="252" fill="#f5f7fa" font-family="system-ui" font-size="17" font-weight="650">Settings snapshot</text>` +
    `<text x="734" y="251" text-anchor="end" fill="#aeb8c5" font-family="system-ui" font-size="12">${issue ? "COMPARISON UNAVAILABLE" : `${entries.length} SETTINGS  ·  ${same} ${linked ? "SHARED" : "MATCHING"}  ·  ${different} DIFFERENT`}</text>` +
    cards +
    `<text x="26" y="536" fill="#aeb8c5" font-family="system-ui" font-size="12">${issue ? "Open the file inspector for details." : `View ${clean(title, 28)} Settings to inspect all ${entries.length} values.`}</text>` +
    `</svg>`;
  return writeSvg(
    "settings-group-previews",
    JSON.stringify({ version: 2, title, file, entries, state, problem, defaultVault, targetVault }),
    svg,
  );
}

export async function relationshipVisual(item: VaultItem): Promise<string> {
  const source = path.basename(item.defaultVault);
  const target = path.basename(item.targetVault);
  const relation = {
    linked: { text: "LIVE LINK", color: "#63d39a", line: "solid", left: "Source", right: "Linked" },
    available: { text: "READY TO LINK", color: "#79bbf3", line: "dashed", left: "Source", right: "Missing" },
    "native-identical": {
      text: "SAME CONTENT · SEPARATE",
      color: "#79bbf3",
      line: "none",
      left: "Own copy",
      right: "Own copy",
    },
    "native-branched": {
      text: "DIFFERENT COPIES",
      color: "#ffbc6c",
      line: "none",
      left: "Own copy",
      right: "Own copy",
    },
    "native-unique": { text: "LOCAL ONLY", color: "#b6a4f5", line: "none", left: "Missing", right: "Own copy" },
    broken: { text: "BROKEN LINK", color: "#f28c91", line: "broken", left: "Missing", right: "Broken link" },
    "foreign-link": {
      text: "OTHER DESTINATION",
      color: "#f28c91",
      line: "none",
      left: "Unverified",
      right: "Other link",
    },
  }[item.state];
  const connection =
    relation.line === "solid"
      ? '<path d="M305 117 H455" stroke="' +
        relation.color +
        '" stroke-width="4" fill="none" marker-end="url(#arrow)"/>'
      : relation.line === "dashed" || relation.line === "broken"
        ? '<path d="M305 117 H455" stroke="' +
          relation.color +
          '" stroke-width="3" stroke-dasharray="8 7" fill="none" marker-end="url(#arrow)"/>'
        : '<circle cx="367" cy="117" r="5" fill="' +
          relation.color +
          '"/><circle cx="392" cy="117" r="5" fill="' +
          relation.color +
          '"/>';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="206" viewBox="0 0 760 206">' +
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="' +
    relation.color +
    '"/></marker></defs>' +
    '<rect width="760" height="206" rx="18" fill="#20242a"/>' +
    '<text x="380" y="41" text-anchor="middle" fill="' +
    relation.color +
    '" font-family="system-ui" font-size="15" font-weight="700">' +
    xml(relation.text) +
    "</text>" +
    '<rect x="28" y="65" width="277" height="105" rx="14" fill="#2d323a" stroke="#53606f"/>' +
    '<rect x="455" y="65" width="277" height="105" rx="14" fill="#2d323a" stroke="' +
    relation.color +
    '"/>' +
    '<text x="48" y="96" fill="#aeb8c5" font-family="system-ui" font-size="13">DEFAULT VAULT</text>' +
    '<text x="48" y="122" fill="#f5f7fa" font-family="system-ui" font-size="17" font-weight="600">' +
    xml(shorten(source, 25)) +
    "</text>" +
    '<text x="48" y="148" fill="#aeb8c5" font-family="system-ui" font-size="13">' +
    xml(relation.left) +
    "</text>" +
    '<text x="475" y="96" fill="#aeb8c5" font-family="system-ui" font-size="13">TARGET VAULT</text>' +
    '<text x="475" y="122" fill="#f5f7fa" font-family="system-ui" font-size="17" font-weight="600">' +
    xml(shorten(target, 25)) +
    "</text>" +
    '<text x="475" y="148" fill="#aeb8c5" font-family="system-ui" font-size="13">' +
    xml(relation.right) +
    "</text>" +
    connection +
    "</svg>";
  return writeSvg(
    "inspector-relationships",
    item.defaultVault + ":" + item.targetVault + ":" + item.id + ":" + item.state,
    svg,
  );
}

/** A set view of plugin activation, separate from the file relationship diagram. */
export async function activationOverlapVisual(
  file: string,
  title: string,
  entries: {
    name: string;
    defaultValue: string;
    targetValue: string;
    inDefault: boolean;
    inTarget: boolean;
    different: boolean;
  }[],
  defaultVault: string,
  targetVault: string,
  shared = false,
): Promise<string> {
  const isCss = file === "appearance.json";
  const unit = isCss ? "CSS snippets" : "plugins";
  const ids = isCss ? "CSS snippet IDs" : "plugin IDs";
  const enabledInDefault = (entry: (typeof entries)[number]) => entry.defaultValue === "Enabled";
  const enabledInTarget = (entry: (typeof entries)[number]) => entry.targetValue === "Enabled";
  const onlyDefault = entries.filter((entry) => enabledInDefault(entry) && !enabledInTarget(entry));
  const both = entries.filter((entry) => enabledInDefault(entry) && enabledInTarget(entry));
  const onlyTarget = entries.filter((entry) => !enabledInDefault(entry) && enabledInTarget(entry));
  const otherDifferences = entries.filter(
    (entry) => entry.different && enabledInDefault(entry) === enabledInTarget(entry),
  );
  const inactiveInBoth = entries.length - onlyDefault.length - both.length - onlyTarget.length;
  const height = file === "core-plugins.json" && otherDifferences.length ? 720 : 650;

  const cluster = (names: string[], x: number, label: string, color: string): string => {
    const chips = names
      .slice(0, 3)
      .map((name, index) => {
        const y = 464 + index * 34;
        return (
          `<rect x="${x + 12}" y="${y}" width="196" height="28" rx="9" fill="#343a43"/>` +
          `<circle cx="${x + 26}" cy="${y + 14}" r="4" fill="${color}"/>` +
          `<text x="${x + 38}" y="${y + 19}" fill="#f1f3f5" font-family="system-ui" font-size="12">${xml(shorten(name, 24))}</text>`
        );
      })
      .join("");
    const empty =
      names.length === 0
        ? `<text x="${x + 110}" y="496" text-anchor="middle" fill="#8693a3" font-family="system-ui" font-size="13">No ${unit}</text>`
        : "";
    const extra =
      names.length > 3
        ? `<text x="${x + 14}" y="583" fill="${color}" font-family="system-ui" font-size="12">+ ${names.length - 3} more in View</text>`
        : "";
    return (
      `<rect x="${x}" y="392" width="220" height="204" rx="16" fill="#2b3038" stroke="#48515e"/>` +
      `<rect x="${x}" y="392" width="220" height="5" rx="3" fill="${color}"/>` +
      `<text x="${x + 14}" y="422" fill="${color}" font-family="system-ui" font-size="12" font-weight="700">${label}</text>` +
      `<text x="${x + 14}" y="450" fill="#f5f7fa" font-family="system-ui" font-size="24" font-weight="700">${names.length}</text>` +
      chips +
      empty +
      extra
    );
  };

  const coreNote =
    file === "core-plugins.json" && otherDifferences.length
      ? `<rect x="24" y="614" width="712" height="70" rx="14" fill="#36332e" stroke="#685b46"/>` +
        `<text x="42" y="639" fill="#e2bc7d" font-family="system-ui" font-size="13" font-weight="700">${otherDifferences.length} OTHER CONFIGURATION ${otherDifferences.length === 1 ? "DIFFERENCE" : "DIFFERENCES"}</text>` +
        `<text x="42" y="662" fill="#d6d0c4" font-family="system-ui" font-size="12">OFF and absent are distinct in core plugin settings. Inspect these IDs in View.</text>`
      : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}">` +
    `<rect width="760" height="${height}" rx="18" fill="#20242a"/>` +
    `<text x="26" y="39" fill="#f5f7fa" font-family="system-ui" font-size="24" font-weight="700">${xml(isCss ? title : `${title} activation`)}</text>` +
    `<text x="26" y="64" fill="#aeb8c5" font-family="system-ui" font-size="12">Which ${unit} are enabled in each vault?</text>` +
    `<text x="220" y="105" text-anchor="middle" fill="#b6a4f5" font-family="system-ui" font-size="12" font-weight="700">${xml(shorten(path.basename(defaultVault), 24))}</text>` +
    `<text x="540" y="105" text-anchor="middle" fill="#77c7ea" font-family="system-ui" font-size="12" font-weight="700">${xml(shorten(path.basename(targetVault), 24))}</text>` +
    `<circle cx="310" cy="234" r="125" fill="#5d4f94" fill-opacity="0.62" stroke="#b6a4f5" stroke-width="2"/>` +
    `<circle cx="450" cy="234" r="125" fill="#296f7d" fill-opacity="0.68" stroke="#77c7ea" stroke-width="2"/>` +
    `<text x="245" y="211" text-anchor="middle" fill="#ddd3ff" font-family="system-ui" font-size="11" font-weight="700">DEFAULT ONLY</text>` +
    `<text x="245" y="255" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="38" font-weight="700">${onlyDefault.length}</text>` +
    `<text x="380" y="211" text-anchor="middle" fill="#d6ffeb" font-family="system-ui" font-size="11" font-weight="700">ON IN BOTH</text>` +
    `<text x="380" y="255" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="38" font-weight="700">${both.length}</text>` +
    `<text x="515" y="211" text-anchor="middle" fill="#d4f4ff" font-family="system-ui" font-size="11" font-weight="700">TARGET ONLY</text>` +
    `<text x="515" y="255" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="38" font-weight="700">${onlyTarget.length}</text>` +
    `<text x="380" y="373" text-anchor="middle" fill="#aeb8c5" font-family="system-ui" font-size="13">${isCss ? (shared ? "Appearance is live linked · activation is shared" : "Enabled CSS snippets stay local to each vault") : `${inactiveInBoth} inactive in both · activation stays local to each vault`}</text>` +
    cluster(
      onlyDefault.map((entry) => entry.name),
      24,
      "DEFAULT ONLY",
      "#b6a4f5",
    ) +
    cluster(
      both.map((entry) => entry.name),
      270,
      "ON IN BOTH",
      "#74d6a0",
    ) +
    cluster(
      onlyTarget.map((entry) => entry.name),
      516,
      "TARGET ONLY",
      "#77c7ea",
    ) +
    coreNote +
    `<text x="26" y="${height - 22}" fill="#aeb8c5" font-family="system-ui" font-size="12">Use Browse IDs to inspect all ${entries.length} ${ids}.</text>` +
    `</svg>`;
  return writeSvg(
    "inspector-activations",
    JSON.stringify({ version: 3, file, entries, defaultVault, targetVault, shared }),
    svg,
  );
}

/** Show vault presence and the corresponding item names in three aligned groups. */
export async function categoryOverviewVisual(
  category: "plugins" | "snippets" | "themes",
  items: VaultItem[],
  defaultVault: string,
  targetVault: string,
  snippetFolderMode?: string,
): Promise<string> {
  const selected = items.filter((item) => item.category === category);
  let wholeFolder = category === "snippets" && snippetFolderMode === "whole-folder";
  if (category === "snippets" && snippetFolderMode === "restore-available") {
    try {
      wholeFolder = (await lstat(path.join(targetVault, ".obsidian", "snippets"))).isSymbolicLink();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  type DisplayItem = { name: string; state: VaultItem["state"] };
  const onlyDefault: DisplayItem[] = [];
  const inBoth: DisplayItem[] = [];
  const onlyTarget: DisplayItem[] = [];
  if (wholeFolder) {
    inBoth.push({ name: "Full snippets folder", state: "linked" });
  } else {
    for (const item of selected) {
      const entry = { name: item.name, state: item.state };
      switch (item.state) {
        case "available":
          onlyDefault.push(entry);
          break;
        case "linked":
        case "native-identical":
        case "native-branched":
          inBoth.push(entry);
          break;
        case "native-unique":
        case "broken":
          onlyTarget.push(entry);
          break;
        case "foreign-link": {
          let usableSource = false;
          try {
            const source = await lstat(item.defaultPath);
            usableSource =
              !source.isSymbolicLink() && (category === "plugins" ? source.isDirectory() : source.isFile());
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
          (usableSource ? inBoth : onlyTarget).push(entry);
          break;
        }
      }
    }
  }

  const stateInfo: Record<VaultItem["state"], { label: string; color: string }> = {
    available: { label: "AVAILABLE", color: "#79bbf3" },
    linked: { label: "LINKED", color: "#74d6a0" },
    "native-unique": { label: "TARGET ONLY", color: "#b6a4f5" },
    "native-identical": { label: "MATCHING COPY", color: "#b6a4f5" },
    "native-branched": { label: "DIFFERENT", color: "#f3b96f" },
    broken: { label: "BROKEN", color: "#f28c91" },
    "foreign-link": { label: "FOREIGN LINK", color: "#f28c91" },
  };
  const rows = Math.max(onlyDefault.length, inBoth.length, onlyTarget.length, 1);
  const panelHeight = 62 + rows * 47;
  const height = 355 + panelHeight + 18;
  const column = (x: number, title: string, entries: DisplayItem[], color: string): string => {
    const content = entries.length
      ? entries
          .map((entry, index) => {
            const y = 412 + index * 47;
            const status = stateInfo[entry.state];
            return (
              `<rect x="${x + 12}" y="${y}" width="196" height="41" rx="9" fill="#343a43"/>` +
              `<text x="${x + 22}" y="${y + 17}" fill="#f5f7fa" font-family="system-ui" font-size="12" font-weight="600">${xml(shorten(entry.name, 26))}</text>` +
              `<circle cx="${x + 25}" cy="${y + 31}" r="3" fill="${status.color}"/>` +
              `<text x="${x + 34}" y="${y + 34}" fill="${status.color}" font-family="system-ui" font-size="10" font-weight="700">${status.label}</text>`
            );
          })
          .join("")
      : `<text x="${x + 110}" y="430" text-anchor="middle" fill="#8591a0" font-family="system-ui" font-size="12">None</text>`;
    return (
      `<rect x="${x}" y="355" width="220" height="${panelHeight}" rx="15" fill="#2b3038" stroke="#48515e"/>` +
      `<rect x="${x}" y="355" width="220" height="5" rx="3" fill="${color}"/>` +
      `<text x="${x + 14}" y="384" fill="${color}" font-family="system-ui" font-size="12" font-weight="700">${title}</text>` +
      `<text x="${x + 204}" y="384" text-anchor="end" fill="#f5f7fa" font-family="system-ui" font-size="20" font-weight="700">${entries.length}</text>` +
      content
    );
  };
  const title =
    category === "plugins"
      ? "Plugin directories across vaults"
      : category === "themes"
        ? "Theme directories across vaults"
        : "CSS snippets across vaults";
  const subtitle = wholeFolder
    ? "The complete snippets folder is one shared item"
    : "Items grouped by where they are present";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}">` +
    `<rect width="760" height="${height}" rx="18" fill="#20242a"/>` +
    `<text x="28" y="40" fill="#f5f7fa" font-family="system-ui" font-size="23" font-weight="700">${title}</text>` +
    `<text x="28" y="64" fill="#aeb8c5" font-family="system-ui" font-size="12">${subtitle}</text>` +
    `<text x="247" y="82" text-anchor="middle" fill="#b6a4f5" font-family="system-ui" font-size="12" font-weight="700">${xml(shorten(path.basename(defaultVault), 24))}</text>` +
    `<text x="513" y="82" text-anchor="middle" fill="#77c7ea" font-family="system-ui" font-size="12" font-weight="700">${xml(shorten(path.basename(targetVault), 24))}</text>` +
    `<circle cx="310" cy="211" r="122" fill="#5d4f94" fill-opacity="0.62" stroke="#b6a4f5" stroke-width="2"/>` +
    `<circle cx="450" cy="211" r="122" fill="#296f7d" fill-opacity="0.68" stroke="#77c7ea" stroke-width="2"/>` +
    `<text x="245" y="190" text-anchor="middle" fill="#ddd3ff" font-family="system-ui" font-size="11" font-weight="700">IN DEFAULT</text>` +
    `<text x="245" y="233" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="37" font-weight="700">${onlyDefault.length}</text>` +
    `<text x="380" y="190" text-anchor="middle" fill="#d6ffeb" font-family="system-ui" font-size="11" font-weight="700">IN BOTH</text>` +
    `<text x="380" y="233" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="37" font-weight="700">${inBoth.length}</text>` +
    `<text x="515" y="190" text-anchor="middle" fill="#d4f4ff" font-family="system-ui" font-size="11" font-weight="700">TARGET ONLY</text>` +
    `<text x="515" y="233" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="37" font-weight="700">${onlyTarget.length}</text>` +
    column(24, "IN DEFAULT", onlyDefault, "#b6a4f5") +
    column(270, "IN BOTH", inBoth, "#74d6a0") +
    column(516, "TARGET ONLY", onlyTarget, "#77c7ea") +
    `</svg>`;
  return writeSvg(
    "category-overviews",
    JSON.stringify({ version: 4, category, selected, defaultVault, targetVault, snippetFolderMode }),
    svg,
  );
}

type Line = { number: number | null; text: string; kind: "context" | "change" | "empty" };
type Row = { left: Line; right: Line };
type FileDiff = { name: string; rows: Row[]; binary: boolean; hiddenRows: number };

function fileName(header: string): string {
  const match = /^diff --git a\/(.+) b\/(.+)$/.exec(header);
  const full = match?.[2] ?? "Changed file";
  const marker = full.indexOf(".obsidian/");
  return marker >= 0 ? full.slice(marker + ".obsidian/".length) : full;
}

function emptyLine(): Line {
  return { number: null, text: "", kind: "empty" };
}

function parseFile(section: string): FileDiff {
  const lines = section.split(/\r?\n/);
  const rows: Row[] = [];
  let oldNumber = 0;
  let newNumber = 0;
  let removals: Line[] = [];
  let additions: Line[] = [];
  let inHunk = false;
  const flush = () => {
    const count = Math.max(removals.length, additions.length);
    for (let index = 0; index < count; index++) {
      rows.push({ left: removals[index] ?? emptyLine(), right: additions[index] ?? emptyLine() });
    }
    removals = [];
    additions = [];
  };
  for (const line of lines.slice(1)) {
    if (line.startsWith("@@")) {
      flush();
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (match) {
        oldNumber = Number(match[1]);
        newNumber = Number(match[2]);
        if (rows.length > 0) rows.push({ left: emptyLine(), right: emptyLine() });
        inHunk = true;
      }
    } else if (inHunk && line.startsWith("-") && !line.startsWith("---")) {
      removals.push({ number: oldNumber++, text: line.slice(1), kind: "change" });
    } else if (inHunk && line.startsWith("+") && !line.startsWith("+++")) {
      additions.push({ number: newNumber++, text: line.slice(1), kind: "change" });
    } else if (inHunk && line.startsWith(" ")) {
      flush();
      const text = line.slice(1);
      rows.push({
        left: { number: oldNumber++, text, kind: "context" },
        right: { number: newNumber++, text, kind: "context" },
      });
    }
  }
  flush();
  return {
    name: fileName(lines[0]),
    rows: rows.slice(0, 48),
    binary: section.includes("Binary files ") || section.includes("GIT binary patch"),
    hiddenRows: Math.max(0, rows.length - 48),
  };
}

function rowSvg(row: Row, index: number): string {
  const y = 83 + index * 25;
  const cell = (line: Line, x: number, left: boolean) => {
    const fill =
      line.kind === "change" ? (left ? "#523039" : "#254638") : line.kind === "empty" ? "#242930" : "#2d333c";
    const number = line.number === null ? "" : String(line.number);
    const prefix = line.kind === "change" ? (left ? "− " : "+ ") : "  ";
    return (
      '<rect x="' +
      x +
      '" y="' +
      y +
      '" width="490" height="25" fill="' +
      fill +
      '"/>' +
      '<text x="' +
      (x + 11) +
      '" y="' +
      (y + 17) +
      '" fill="#aeb8c5" font-family="monospace" font-size="13">' +
      number +
      "</text>" +
      '<text x="' +
      (x + 56) +
      '" y="' +
      (y + 17) +
      '" fill="#f1f3f5" font-family="monospace" font-size="13">' +
      xml(prefix + shorten(line.text.replaceAll("\t", "  "), 53)) +
      "</text>"
    );
  };
  return cell(row.left, 20, true) + cell(row.right, 510, false);
}

function fileSvg(file: FileDiff, leftTitle: string, rightTitle: string): string {
  const visibleRows = file.rows.length || 1;
  const height = 94 + visibleRows * 25 + (file.hiddenRows > 0 ? 30 : 0);
  const content = file.rows.length
    ? file.rows.map(rowSvg).join("")
    : '<text x="40" y="105" fill="#aeb8c5" font-family="system-ui" font-size="14">' +
      (file.binary ? "Binary file changed; no text lines to display." : "No text lines to display.") +
      "</text>";
  const more =
    file.hiddenRows > 0
      ? '<text x="40" y="' +
        (height - 12) +
        '" fill="#aeb8c5" font-family="system-ui" font-size="13">' +
        file.hiddenRows +
        " more rows in Technical Diff</text>"
      : "";
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="' +
    height +
    '" viewBox="0 0 1000 ' +
    height +
    '">' +
    '<rect width="1000" height="' +
    height +
    '" rx="14" fill="#20242a"/>' +
    '<text x="24" y="30" fill="#f5f7fa" font-family="system-ui" font-size="16" font-weight="700">' +
    xml(shorten(file.name, 95)) +
    "</text>" +
    '<rect x="20" y="47" width="490" height="36" fill="#3e2b32"/><rect x="510" y="47" width="490" height="36" fill="#294235"/>' +
    '<text x="35" y="71" fill="#f5f7fa" font-family="system-ui" font-size="14" font-weight="600">' +
    xml(shorten(leftTitle, 38)) +
    "</text>" +
    '<text x="525" y="71" fill="#f5f7fa" font-family="system-ui" font-size="14" font-weight="600">' +
    xml(shorten(rightTitle, 38)) +
    "</text>" +
    content +
    more +
    "</svg>"
  );
}

export interface DiffVisuals {
  files: { name: string; path: string }[];
  hiddenFiles: number;
}

export async function sideBySideDiffs(
  patch: string,
  key: string,
  leftTitle: string,
  rightTitle: string,
): Promise<DiffVisuals> {
  const sections = patch.split(/(?=^diff --git )/m).filter((section) => section.startsWith("diff --git "));
  const parsed = sections.slice(0, 20).map(parseFile);
  const files = await Promise.all(
    parsed.map(async (file, index) => ({
      name: file.name,
      path: await writeSvg("inspector-diffs", key + ":" + index + ":" + patch, fileSvg(file, leftTitle, rightTitle)),
    })),
  );
  return { files, hiddenFiles: Math.max(0, sections.length - parsed.length) };
}
