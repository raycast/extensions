import { Detail, useNavigation } from "@raycast/api";
import { FormulaActionPanel } from "./actionPanels";
import { Formula, brewIsInstalled, brewPrefix } from "../brew";

export function FormulaInfo(props: {
  formula: Formula;
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const { pop } = useNavigation();
  return (
    <Detail
      markdown={formatInfo(props.formula, props.isInstalled)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Homepage" text={props.formula.homepage} target={props.formula.homepage} />
          <Detail.Metadata.Label title="License" text={props.formula.license} />
        </Detail.Metadata>
      }
      actions={
        <FormulaActionPanel
          formula={props.formula}
          showDetails={false}
          isInstalled={props.isInstalled}
          onAction={(result) => {
            pop();
            props.onAction(result);
          }}
        />
      }
    />
  );
}

/// Private

function formatInfo(formula: Formula, isInstalled: (name: string) => boolean): string {
  return `
# ${formula.name}
${formula.desc}

${formatVersions(formula)}

${formatDependencies(formula, isInstalled)}

${formatConflicts(formula)}

${formatCaveats(formula)}
  `;
}

function formatVersions(formula: Formula): string {
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
  let markdown = `
#### Versions
Stable: ${versions.stable} ${status ? `(${status.join(", ")})` : ""}

`;
  if (versions.head) {
    markdown += versions.head;
  }

  return markdown;
}

function formatDependencies(formula: Formula, isInstalled: (name: string) => boolean): string {
  let markdown = "";

  if (formula.dependencies.length > 0) {
    const dependencies = formula.dependencies
      .map((dep) => {
        return isInstalled(dep) ? `__${dep}__` : `${dep}`;
      })
      .join(", ");

    markdown += `
Required: ${dependencies}
    `;
  }

  if (formula.build_dependencies.length > 0) {
    const build_dependencies = formula.build_dependencies
      .map((dep) => {
        return isInstalled(dep) ? `__${dep}__` : `${dep}`;
      })
      .join(", ");

    markdown += `
Build: ${build_dependencies}
    `;
  }

  if (markdown) {
    return `#### Dependencies
${markdown}
    `;
  } else {
    return "";
  }
}

function formatConflicts(formula: Formula): string {
  if (!formula.conflicts_with || formula.conflicts_with.length == 0) {
    return "";
  }

  return `#### Conflicts With
 ${formula.conflicts_with.join(", ")}
  `;
}

function formatCaveats(formula: Formula): string {
  let caveats = "";

  if (formula.keg_only) {
    caveats += `
${formula.name} is keg-only, which means it is not symlinked into ${brewPrefix}.
    `;
  }

  if (formula.caveats) {
    caveats += `
${formula.caveats}
    `;
  }

  if (caveats) {
    return `#### Caveats
${caveats}
    `;
  } else {
    return "";
  }
}
