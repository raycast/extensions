import React, { useEffect, useState } from "react";
import { Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { CaskActionPanel } from "./actionPanels";
import { Cask, brewName, brewFetchCaskInfo, uiLogger } from "../utils";
import { Dependencies } from "./dependencies";

/**
 * Check if a cask has minimal data (from fast list) vs full data.
 */
function hasMinimalData(cask: Cask): boolean {
  // Minimal casks have missing or empty homepage, tap, or desc
  return !cask.homepage || !cask.tap || !cask.desc;
}

export function CaskInfo({
  cask: initialCask,
  isInstalled,
  onAction,
}: {
  cask: Cask;
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}) {
  const { pop } = useNavigation();
  const [cask, setCask] = useState<Cask>(initialCask);
  const [isLoading, setIsLoading] = useState(false);

  // Log when viewing cask info
  useEffect(() => {
    uiLogger.log("Viewing cask info", {
      token: initialCask.token,
      name: brewName(initialCask),
      hasMinimalData: hasMinimalData(initialCask),
      installed: initialCask.installed,
      version: initialCask.version,
    });
  }, [initialCask]);

  // Lazy load full cask data if we only have minimal data
  useEffect(() => {
    if (!hasMinimalData(initialCask)) {
      return;
    }

    const loadFullData = async () => {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Loading ${brewName(initialCask)} info...`,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const fullCask = await brewFetchCaskInfo(initialCask.token, controller.signal);
        clearTimeout(timeoutId);

        if (fullCask) {
          // Preserve installed version from initial cask
          if (initialCask.installed) {
            fullCask.installed = initialCask.installed;
          }
          setCask(fullCask);
          uiLogger.log("Cask info loaded", {
            token: fullCask.token,
            name: brewName(fullCask),
            desc: fullCask.desc?.substring(0, 50),
          });
          toast.hide();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to load cask info";
        }
      } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = (err as Error).name === "AbortError";
        uiLogger.error("Failed to load cask info", {
          token: initialCask.token,
          error: err,
          timeout: isTimeout,
        });
        toast.style = Toast.Style.Failure;
        toast.title = isTimeout ? "Cask info load timed out" : "Failed to load cask info";
      } finally {
        setIsLoading(false);
      }
    };

    loadFullData();
  }, [initialCask]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={formatInfo(cask)}
      navigationTitle={`Cask Info: ${brewName(cask)}`}
      metadata={
        <Detail.Metadata>
          {cask.homepage ? (
            <Detail.Metadata.Link title="Homepage" text={cask.homepage} target={cask.homepage} />
          ) : (
            <Detail.Metadata.Label title="Homepage" text="Loading..." />
          )}
          <Detail.Metadata.Label title="Tap" text={cask.tap || "Loading..."} />
          <CaskVersion cask={cask} />
          <CaskDependencies cask={cask} />
          <Dependencies title="Conflicts With" dependencies={cask.conflicts_with?.cask} isInstalled={isInstalled} />
          <Detail.Metadata.Label title="Auto Updates" text={cask.auto_updates ? "Yes" : "No"} />
        </Detail.Metadata>
      }
      actions={
        <CaskActionPanel
          cask={cask}
          showDetails={false}
          isInstalled={isInstalled}
          onAction={(result) => {
            pop();
            onAction(result);
          }}
        />
      }
    />
  );
}

/// Private

function CaskDependencies({ cask }: { cask: Cask }) {
  const macos = cask.depends_on?.macos;

  if (!macos) {
    return null;
  }

  return (
    <Detail.Metadata.TagList title="macOS Version">
      {Object.keys(macos).map((key) => {
        const values = macos[key];
        if (values) {
          return <Detail.Metadata.TagList.Item key={key} text={`${key} ${values.join(", ")}`} />;
        }
        return null;
      })}
    </Detail.Metadata.TagList>
  );
}

function CaskVersion({ cask }: { cask: Cask }) {
  const version = cask.installed ? `${cask.installed} (installed)` : cask.version;
  return version ? <Detail.Metadata.Label title="Version" text={version} /> : null;
}

function formatInfo(cask: Cask): string {
  return `
# ${brewName(cask)}
${cask.desc}

${formatCaveats(cask)}
  `;
}

function formatCaveats(cask: Cask): string {
  if (cask.caveats) {
    return `#### Caveats
${cask.caveats}
    `;
  }
  return "";
}
