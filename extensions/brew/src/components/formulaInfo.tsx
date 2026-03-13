import React, { useEffect, useState } from "react";
import { Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { FormulaActionPanel } from "./actionPanels";
import { Formula, brewIsInstalled, brewPrefix, brewFetchFormulaInfo, uiLogger, ensureError } from "../utils";
import { Dependencies } from "./dependencies";

/**
 * Check if a formula has minimal data (from fast list) vs full data.
 */
function hasMinimalData(formula: Formula): boolean {
  // Minimal formulae have missing or empty homepage, tap, or desc
  return !formula.homepage || !formula.tap || !formula.desc;
}

export function FormulaInfo(props: {
  formula: Formula;
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}) {
  const { pop } = useNavigation();
  const [formula, setFormula] = useState<Formula>(props.formula);
  const [isLoading, setIsLoading] = useState(false);

  // Log when viewing formula info
  useEffect(() => {
    uiLogger.log("Viewing formula info", {
      name: props.formula.name,
      hasMinimalData: hasMinimalData(props.formula),
      installed: props.formula.installed?.length > 0,
      version: props.formula.versions.stable,
    });
  }, [props.formula]);

  // Lazy load full formula data if we only have minimal data
  useEffect(() => {
    if (!hasMinimalData(props.formula)) {
      return;
    }

    const loadFullData = async () => {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Loading ${props.formula.name} info...`,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const fullFormula = await brewFetchFormulaInfo(props.formula.name, controller.signal);
        clearTimeout(timeoutId);

        if (fullFormula) {
          // Preserve installed info from initial formula
          if (props.formula.installed?.length > 0) {
            fullFormula.installed = props.formula.installed;
          }
          setFormula(fullFormula);
          uiLogger.log("Formula info loaded", {
            name: fullFormula.name,
            desc: fullFormula.desc?.substring(0, 50),
            dependencies: fullFormula.dependencies?.length ?? 0,
          });
          toast.hide();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to load formula info";
        }
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = ensureError(err).name === "AbortError";
        uiLogger.error("Failed to load formula info", {
          name: props.formula.name,
          error: err,
          timeout: isTimeout,
        });
        toast.style = Toast.Style.Failure;
        toast.title = isTimeout ? "Formula info load timed out" : "Failed to load formula info";
      } finally {
        setIsLoading(false);
      }
    };

    loadFullData();
  }, [props.formula]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={formatInfo(formula)}
      metadata={
        <Detail.Metadata>
          {formula.homepage ? (
            <Detail.Metadata.Link title="Homepage" text={formula.homepage} target={formula.homepage} />
          ) : (
            <Detail.Metadata.Label title="Homepage" text="Loading..." />
          )}
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
          formula={formula}
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
