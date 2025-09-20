import { Detail, useNavigation } from "@raycast/api";
import { FormulaActionPanel } from "./actionPanels";
import { Formula, brewIsInstalled, brewPrefix } from "../brew";
import { Dependencies } from "./dependencies";

export function FormulaInfo(props: {
  formula: Formula;
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const { pop } = useNavigation();
  const formula = props.formula;
  return (
    <Detail
      markdown={formatInfo(formula)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Homepage" text={formula.homepage} target={formula.homepage} />
          {formula.license && <Detail.Metadata.Label title="License" text={formula.license} />}
          <Detail.Metadata.Label title="Versions" text={formatVersions(formula)} />
          {formula.versions.head && <Detail.Metadata.Label title="" text={formula.versions.head} />}
          <Dependencies title="Dependencies" dependencies={formula.dependencies} isInstalled={props.isInstalled} />
          <Dependencies
            title="Build Dependencies"
            dependencies={formula.build_dependencies}
            isInstalled={props.isInstalled}
          />
          <Dependencies title="Conflicts With" dependencies={formula.conflicts_with} isInstalled={props.isInstalled} />
          {formula.pinned && <Detail.Metadata.Label title="Pinned" text="Yes" />}
          {formula.keg_only && <Detail.Metadata.Label title="Keg Only" text="Yes" />}
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

function formatInfo(formula: Formula): string {
  return `
# ${formula.name}
${formula.desc}

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
  return `${versions.stable} ${status ? `(${status.join(", ")})` : ""}`;
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
