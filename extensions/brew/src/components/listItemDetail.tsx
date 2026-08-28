/**
 * List Item Detail components for displaying package metadata in split-view.
 *
 * These components render metadata panels for formulae and casks
 * when the split-view is enabled in search results.
 */

import { Color, Icon, List } from "@raycast/api";
import { Cask, Formula, brewIsInstalled, brewName, brewPrefix, analyticsRows, packageStatus } from "../utils";
import { PackageDetailState, usePackageDetail } from "../hooks/usePackageDetail";

interface FormulaListItemDetailProps {
  formula: Formula;
  isInstalled: (name: string) => boolean;
  /** Only the selected row fetches its analytics — see AnalyticsMetadata. */
  isSelected?: boolean;
  /** When false, the panel drops the markdown and is metadata only. */
  showDescription?: boolean;
}

interface CaskListItemDetailProps {
  cask: Cask;
  isInstalled: (name: string) => boolean;
  isSelected?: boolean;
  showDescription?: boolean;
}

/**
 * Detail panel for a formula in the split-view.
 */
export function FormulaListItemDetail({
  formula,
  isInstalled,
  isSelected,
  showDescription = true,
}: FormulaListItemDetailProps) {
  const detail = usePackageDetail(formula.name, false, isSelected ?? false);

  return (
    <List.Item.Detail
      markdown={showDescription ? formatFormulaMarkdown(formula) : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <StatusMetadata state={detail} />
          {/* With the markdown hidden the description has nowhere else to go. */}
          {!showDescription && (
            <MarkdownOnlyMetadata description={formula.desc} caveats={formulaCaveatsText(formula)} />
          )}
          {formula.homepage ? (
            <List.Item.Detail.Metadata.Link title="Homepage" text={formula.homepage} target={formula.homepage} />
          ) : (
            <List.Item.Detail.Metadata.Label title="Homepage" text="—" />
          )}
          <List.Item.Detail.Metadata.Separator />
          {formula.license && (
            <>
              <List.Item.Detail.Metadata.Label title="License" text={formula.license} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Label title="Version" text={formatFormulaVersion(formula)} />
          {formula.versions.head && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Head" text={formula.versions.head} />
            </>
          )}
          <ListItemDependenciesWithSeparator
            title="Dependencies"
            dependencies={formula.dependencies}
            isInstalled={isInstalled}
          />
          <ListItemDependenciesWithSeparator
            title="Build Dependencies"
            dependencies={formula.build_dependencies}
            isInstalled={isInstalled}
          />
          <ListItemDependenciesWithSeparator
            title="Conflicts With"
            dependencies={formula.conflicts_with}
            isInstalled={isInstalled}
          />
          {formula.pinned && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Pinned" text="Yes" />
            </>
          )}
          {formula.keg_only && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Keg Only" text="Yes" />
            </>
          )}
          <AnalyticsMetadata state={detail} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * Detail panel for a cask in the split-view.
 */
export function CaskListItemDetail({ cask, isInstalled, isSelected, showDescription = true }: CaskListItemDetailProps) {
  const detail = usePackageDetail(cask.token, true, isSelected ?? false);

  return (
    <List.Item.Detail
      markdown={showDescription ? formatCaskMarkdown(cask) : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <StatusMetadata state={detail} />
          {!showDescription && <MarkdownOnlyMetadata description={cask.desc} caveats={cask.caveats} />}
          <List.Item.Detail.Metadata.Label title="Id" text={cask.token || "—"} />
          <List.Item.Detail.Metadata.Separator />
          {cask.homepage ? (
            <List.Item.Detail.Metadata.Link title="Homepage" text={cask.homepage} target={cask.homepage} />
          ) : (
            <List.Item.Detail.Metadata.Label title="Homepage" text="—" />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Tap" text={cask.tap || "—"} />
          <List.Item.Detail.Metadata.Separator />
          <CaskVersionMetadata cask={cask} />
          <CaskDependenciesMetadataWithSeparator cask={cask} />
          <ListItemDependenciesWithSeparator
            title="Conflicts With"
            dependencies={cask.conflicts_with?.cask}
            isInstalled={isInstalled}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Auto Updates" text={cask.auto_updates ? "Yes" : "No"} />
          <AnalyticsMetadata state={detail} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/// Private helpers

/**
 * Carry the markdown-only content into the metadata list.
 *
 * The description reads fine as a row. Caveats do not — they are multi-line
 * shell instructions that a single metadata row truncates to uselessness — so
 * this reports only whether there ARE any, and the full text stays one keypress
 * away in the pushed Details view (⏎ / Show Details), which renders them as
 * prose.
 */
function MarkdownOnlyMetadata(props: { description?: string; caveats?: string }) {
  if (!props.description && !props.caveats) {
    return null;
  }
  return (
    <>
      {props.description && <List.Item.Detail.Metadata.Label title="Description" text={props.description} />}
      <List.Item.Detail.Metadata.Label
        title="Caveats"
        text={props.caveats ? "Yes" : "None"}
        icon={props.caveats ? { source: Icon.Info, tintColor: Color.Blue } : undefined}
      />
      <List.Item.Detail.Metadata.Separator />
    </>
  );
}

/** Plain-text caveats, including the keg-only note the markdown synthesizes. */
function formulaCaveatsText(formula: Formula): string | undefined {
  const parts: string[] = [];
  if (formula.keg_only) {
    parts.push(`${formula.name} is keg-only, so it is not symlinked into ${brewPrefix}.`);
  }
  if (formula.caveats) {
    parts.push(formula.caveats.trim());
  }
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

/**
 * Deprecation or disablement, first in the panel because it changes whether a
 * package is worth installing at all.
 *
 * Rendered only when there is something to say — a row reading "Status: Active"
 * on every healthy package is noise, and this is a warning, not a field.
 */
function StatusMetadata(props: { state: PackageDetailState }) {
  const status = packageStatus(props.state.data);

  if (!status) {
    return null;
  }

  return (
    <>
      <List.Item.Detail.Metadata.Label
        title={status.title}
        text={{ value: status.text, color: Color.Orange }}
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      />
      <List.Item.Detail.Metadata.Separator />
    </>
  );
}

/**
 * Install counts from formulae.brew.sh, matching the analytics table on a
 * package's page there.
 *
 * Rows are always rendered — see analyticsRows. Returning null until the fetch
 * landed made the panel jump as the rows appeared beneath the user's cursor.
 */
function AnalyticsMetadata(props: { state: PackageDetailState }) {
  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      {analyticsRows(props.state.data, props.state.failed).map((row) => (
        <List.Item.Detail.Metadata.Label key={row.key} title={row.title} text={row.text} />
      ))}
    </>
  );
}

interface ListItemDependenciesProps {
  title: string;
  dependencies?: string[];
  isInstalled: (name: string) => boolean;
}

/**
 * Display a list of dependencies with installation status (for List.Item.Detail).
 * Includes a leading separator.
 */
function ListItemDependenciesWithSeparator({ title, dependencies, isInstalled }: ListItemDependenciesProps) {
  if (!dependencies || dependencies.length === 0) {
    return null;
  }

  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title={title}>
        {dependencies.map((dep) => (
          <List.Item.Detail.Metadata.TagList.Item
            key={dep}
            text={dep}
            color={isInstalled(dep) ? Color.Green : Color.SecondaryText}
          />
        ))}
      </List.Item.Detail.Metadata.TagList>
    </>
  );
}

function CaskDependenciesMetadataWithSeparator({ cask }: { cask: Cask }) {
  const macos = cask.depends_on?.macos;

  if (!macos) {
    return null;
  }

  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="macOS Version">
        {Object.keys(macos).map((key) => {
          const values = macos[key];
          if (values) {
            return <List.Item.Detail.Metadata.TagList.Item key={key} text={`${key} ${values.join(", ")}`} />;
          }
          return null;
        })}
      </List.Item.Detail.Metadata.TagList>
    </>
  );
}

function CaskVersionMetadata({ cask }: { cask: Cask }) {
  const version = cask.installed ? `${cask.installed} (installed)` : cask.version;
  return version ? <List.Item.Detail.Metadata.Label title="Version" text={version} /> : null;
}

function formatFormulaMarkdown(formula: Formula): string {
  return `# ${formula.name}
${formula.desc || ""}

${formatFormulaCaveats(formula)}`;
}

function formatCaskMarkdown(cask: Cask): string {
  return `# ${brewName(cask)}
${cask.desc || ""}

${formatCaskCaveats(cask)}`;
}

function formatFormulaVersion(formula: Formula): string {
  const versions = formula.versions;
  const status = [];
  if (versions.bottle) {
    status.push("bottled");
  }
  if (brewIsInstalled(formula)) {
    status.push("installed");
  }
  if (formula.installed.first()?.installed_as_dependency) {
    status.push("dependency");
  }
  return `${versions.stable} ${status.length > 0 ? `(${status.join(", ")})` : ""}`;
}

function formatFormulaCaveats(formula: Formula): string {
  let caveats = "";

  if (formula.keg_only) {
    caveats += `${formula.name} is keg-only, which means it is not symlinked into ${brewPrefix}.\n`;
  }

  if (formula.caveats) {
    caveats += `${formula.caveats}\n`;
  }

  if (caveats) {
    return `#### Caveats\n${caveats}`;
  }
  return "";
}

function formatCaskCaveats(cask: Cask): string {
  if (cask.caveats) {
    return `#### Caveats\n${cask.caveats}`;
  }
  return "";
}
