import React, { useEffect, useState } from "react";
import { Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { CaskActionPanel } from "./actionPanels";
import { Cask, brewName, brewFetchCaskInfo, uiLogger, ensureError } from "../utils";
import { DetailMetadata, caskMetadataRows } from "./packageMetadata";
import { usePackageDetail } from "../hooks/usePackageDetail";

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
  // Fetched once here and shared by both metadata blocks below. Always executed:
  // unlike a list row, this view exists only because the user opened it.
  const packageDetail = usePackageDetail(initialCask.token, true, true);
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
        const isTimeout = ensureError(err).name === "AbortError";
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
        <DetailMetadata
          rows={caskMetadataRows(cask, {
            isInstalled,
            detail: packageDetail,
            // The markdown pane already renders the description and caveats.
            showDescription: true,
            isLoading,
          })}
        />
      }
      actions={
        <CaskActionPanel
          cask={cask}
          showDetailsAction={false}
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
