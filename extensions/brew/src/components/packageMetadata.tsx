/**
 * The metadata shown for a package — defined ONCE, rendered in two places.
 *
 * `Detail.Metadata.Label` and `List.Item.Detail.Metadata.Label` are distinct
 * components, so the JSX genuinely cannot be shared between the Search sidebar
 * and the pushed Details view. Every time the two were written out separately
 * they drifted: statistics and the deprecation warning were added to one and
 * not the other, the version line was fixed in one and not the other, and the
 * same value was titled "Version" in one and "Versions" in the other.
 *
 * So the ROWS are built here as data, and each view renders that data with its
 * own namespace. A new row is added in one place and appears in both.
 */

import { Color, Detail, Icon, Image, List } from "@raycast/api";
import {
  Cask,
  Formula,
  brewInstalledVersion,
  brewIsInstalled,
  brewIsOutdated,
  isCask,
  brewPrefix,
  analyticsRows,
  packageStatus,
} from "../utils";
import { PackageDetailState } from "../hooks/usePackageDetail";

export type MetadataRow =
  | { kind: "label"; key: string; title: string; text: string; color?: Color; icon?: Image.ImageLike }
  | { kind: "link"; key: string; title: string; text: string; target: string }
  | { kind: "tags"; key: string; title: string; tags: { text: string; color?: Color.ColorLike }[] }
  | { kind: "separator"; key: string };

export interface MetadataOptions {
  isInstalled: (name: string) => boolean;
  detail: PackageDetailState;
  /**
   * True when the markdown pane is showing the description and caveats, so
   * they are not repeated as rows. The Details view always renders them as
   * prose; the sidebar only does when its description is not hidden.
   */
  showDescription: boolean;
  /**
   * The view is still fetching the package's full record. A missing field then
   * means "not here yet", not "absent" — the Details view opens with only the
   * minimal record from the list and fills in.
   */
  isLoading?: boolean;
}

/// Row builders

/**
 * The version line: what is INSTALLED, plus what is available when they differ.
 *
 * Never leads with `versions.stable` on an installed package — that is the
 * version on offer, not the one present, and labelling it "installed" claimed a
 * version the user did not have.
 */
export function formatPackageVersion(item: Cask | Formula): string {
  const cask = isCask(item);
  const available = cask ? item.version : item.versions.stable;
  const installedVersion = brewInstalledVersion(item);

  const status: string[] = [];
  if (!cask && item.versions.bottle) {
    status.push("bottled");
  }
  if (brewIsInstalled(item)) {
    status.push("installed");
  }
  if (!cask && item.installed?.first()?.installed_as_dependency) {
    status.push("dependency");
  }

  const version =
    installedVersion && brewIsOutdated(item) ? `${installedVersion} → ${available}` : (installedVersion ?? available);

  return status.length > 0 ? `${version} (${status.join(", ")})` : version;
}

function dependencyTags(names: string[] | undefined, isInstalled: (name: string) => boolean) {
  return (names ?? []).map((name) => ({ text: name, color: isInstalled(name) ? Color.Green : Color.SecondaryText }));
}

/** Leading rows shared by both kinds: the lifecycle warning, then the prose. */
function leadingRows(item: Cask | Formula, options: MetadataOptions, caveats: string | undefined): MetadataRow[] {
  const rows: MetadataRow[] = [];

  const status = packageStatus(options.detail.data);
  if (status) {
    rows.push({
      kind: "label",
      key: "status",
      title: status.title,
      text: status.text,
      color: Color.Orange,
      icon: { source: Icon.Warning, tintColor: Color.Orange },
    });
    rows.push({ kind: "separator", key: "status-sep" });
  }

  if (!options.showDescription) {
    if (item.desc) {
      rows.push({ kind: "label", key: "description", title: "Description", text: item.desc });
    }
    rows.push({
      kind: "label",
      key: "caveats",
      title: "Caveats",
      text: caveats ? "Yes" : "None",
      icon: caveats ? { source: Icon.Info, tintColor: Color.Blue } : undefined,
    });
    rows.push({ kind: "separator", key: "prose-sep" });
  }

  return rows;
}

/** Trailing statistics rows, identical in both views. */
function statisticsRows(options: MetadataOptions): MetadataRow[] {
  return [
    { kind: "separator", key: "stats-sep" },
    ...analyticsRows(options.detail.data, options.detail.failed).map(
      (row): MetadataRow => ({
        kind: "label",
        key: `stat-${row.key}`,
        title: row.title,
        text: row.text,
        icon: row.unavailable ? { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText } : undefined,
      }),
    ),
  ];
}

/** What an empty field shows: still arriving, or genuinely not set. */
function missing(options: MetadataOptions): string {
  return options.isLoading ? "Loading…" : "—";
}

function homepageRow(homepage: string | undefined, options: MetadataOptions): MetadataRow {
  return homepage
    ? { kind: "link", key: "homepage", title: "Homepage", text: homepage, target: homepage }
    : { kind: "label", key: "homepage", title: "Homepage", text: missing(options) };
}

/** Plain-text caveats, including the keg-only note the markdown synthesizes. */
export function formulaCaveatsText(formula: Formula): string | undefined {
  const parts: string[] = [];
  if (formula.keg_only) {
    parts.push(`${formula.name} is keg-only, so it is not symlinked into ${brewPrefix}.`);
  }
  if (formula.caveats) {
    parts.push(formula.caveats.trim());
  }
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

export function formulaMetadataRows(formula: Formula, options: MetadataOptions): MetadataRow[] {
  const rows: MetadataRow[] = [
    ...leadingRows(formula, options, formulaCaveatsText(formula)),
    homepageRow(formula.homepage, options),
    { kind: "separator", key: "homepage-sep" },
  ];

  if (formula.license) {
    rows.push({ kind: "label", key: "license", title: "License", text: formula.license });
    rows.push({ kind: "separator", key: "license-sep" });
  }

  rows.push({ kind: "label", key: "version", title: "Version", text: formatPackageVersion(formula) });

  if (formula.versions.head) {
    rows.push({ kind: "separator", key: "head-sep" });
    rows.push({ kind: "label", key: "head", title: "Head", text: formula.versions.head });
  }

  for (const [key, title, names] of [
    ["dependencies", "Dependencies", formula.dependencies],
    ["build-dependencies", "Build Dependencies", formula.build_dependencies],
    ["conflicts", "Conflicts With", formula.conflicts_with],
  ] as const) {
    if (names && names.length > 0) {
      rows.push({ kind: "separator", key: `${key}-sep` });
      rows.push({ kind: "tags", key, title, tags: dependencyTags(names, options.isInstalled) });
    }
  }

  if (formula.pinned) {
    rows.push({ kind: "separator", key: "pinned-sep" });
    rows.push({ kind: "label", key: "pinned", title: "Pinned", text: "Yes" });
  }
  if (formula.keg_only) {
    rows.push({ kind: "separator", key: "keg-sep" });
    rows.push({ kind: "label", key: "keg-only", title: "Keg Only", text: "Yes" });
  }

  return [...rows, ...statisticsRows(options)];
}

export function caskMetadataRows(cask: Cask, options: MetadataOptions): MetadataRow[] {
  const rows: MetadataRow[] = [
    ...leadingRows(cask, options, cask.caveats),
    { kind: "label", key: "id", title: "Id", text: cask.token || missing(options) },
    { kind: "separator", key: "id-sep" },
    homepageRow(cask.homepage, options),
    { kind: "separator", key: "homepage-sep" },
    { kind: "label", key: "tap", title: "Tap", text: cask.tap || missing(options) },
    { kind: "separator", key: "tap-sep" },
    { kind: "label", key: "version", title: "Version", text: formatPackageVersion(cask) },
  ];

  const macos = cask.depends_on?.macos;
  if (macos) {
    rows.push({ kind: "separator", key: "macos-sep" });
    rows.push({
      kind: "tags",
      key: "macos",
      title: "macOS Version",
      tags: Object.entries(macos)
        .filter(([, values]) => values)
        .map(([key, values]) => ({ text: `${key} ${values.join(", ")}` })),
    });
  }

  const conflicts = cask.conflicts_with?.cask;
  if (conflicts && conflicts.length > 0) {
    rows.push({ kind: "separator", key: "conflicts-sep" });
    rows.push({
      kind: "tags",
      key: "conflicts",
      title: "Conflicts With",
      tags: dependencyTags(conflicts, options.isInstalled),
    });
  }

  rows.push({ kind: "separator", key: "auto-sep" });
  rows.push({ kind: "label", key: "auto-updates", title: "Auto Updates", text: cask.auto_updates ? "Yes" : "No" });

  return [...rows, ...statisticsRows(options)];
}

/// Renderers — one per metadata namespace, both driven by the rows above

/**
 * The two metadata namespaces, which are structurally interchangeable — the
 * components accept the same props, they are just reached through different
 * parents. Writing the switch twice was the last place these two views could
 * drift, which is the whole thing this module exists to prevent.
 *
 * If Raycast ever diverges them, this stops compiling rather than silently
 * rendering one view differently from the other.
 */
type MetadataNamespace = Pick<typeof Detail.Metadata, "Label" | "Link" | "TagList" | "Separator">;

function renderRows(M: MetadataNamespace, rows: MetadataRow[]) {
  return rows.map((row) => {
    switch (row.kind) {
      case "separator":
        return <M.Separator key={row.key} />;
      case "link":
        return <M.Link key={row.key} title={row.title} text={row.text} target={row.target} />;
      case "tags":
        return (
          <M.TagList key={row.key} title={row.title}>
            {row.tags.map((tag) => (
              <M.TagList.Item key={tag.text} text={tag.text} color={tag.color} />
            ))}
          </M.TagList>
        );
      case "label":
        return (
          <M.Label
            key={row.key}
            title={row.title}
            text={row.color ? { value: row.text, color: row.color } : row.text}
            icon={row.icon}
          />
        );
    }
  });
}

export function ListMetadata(props: { rows: MetadataRow[] }) {
  return <List.Item.Detail.Metadata>{renderRows(List.Item.Detail.Metadata, props.rows)}</List.Item.Detail.Metadata>;
}

export function DetailMetadata(props: { rows: MetadataRow[] }) {
  return <Detail.Metadata>{renderRows(Detail.Metadata, props.rows)}</Detail.Metadata>;
}
