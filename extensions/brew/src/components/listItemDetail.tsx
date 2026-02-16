/**
 * List Item Detail components for displaying package metadata in split-view.
 *
 * These components render metadata panels for formulae and casks
 * when the split-view is enabled in search results.
 */

import { Color, List } from "@raycast/api";
import { Cask, Formula, brewIsInstalled, brewName, brewPrefix } from "../utils";

interface FormulaListItemDetailProps {
  formula: Formula;
  isInstalled: (name: string) => boolean;
}

interface CaskListItemDetailProps {
  cask: Cask;
  isInstalled: (name: string) => boolean;
}

/**
 * Detail panel for a formula in the split-view.
 */
export function FormulaListItemDetail({ formula, isInstalled }: FormulaListItemDetailProps) {
  return (
    <List.Item.Detail
      markdown={formatFormulaMarkdown(formula)}
      metadata={
        <List.Item.Detail.Metadata>
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
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * Detail panel for a cask in the split-view.
 */
export function CaskListItemDetail({ cask, isInstalled }: CaskListItemDetailProps) {
  return (
    <List.Item.Detail
      markdown={formatCaskMarkdown(cask)}
      metadata={
        <List.Item.Detail.Metadata>
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
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/// Private helpers

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
