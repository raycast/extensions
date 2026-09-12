/**
 * List Item Detail components for displaying package metadata in split-view.
 *
 * These components render metadata panels for formulae and casks
 * when the split-view is enabled in search results.
 */

import { List } from "@raycast/api";
import { Cask, Formula, brewName, brewPrefix } from "../utils";
import { usePackageDetail } from "../hooks/usePackageDetail";
import { ListMetadata, caskMetadataRows, formulaMetadataRows } from "./packageMetadata";

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
      metadata={<ListMetadata rows={formulaMetadataRows(formula, { isInstalled, detail, showDescription })} />}
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
      metadata={<ListMetadata rows={caskMetadataRows(cask, { isInstalled, detail, showDescription })} />}
    />
  );
}

/// Private helpers

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
