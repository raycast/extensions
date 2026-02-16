import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { getProfileMetadataMap } from "../storage";
import { ResolvedBrowserProfile, ScanWarning } from "../types";
import { detectBrowserProfiles } from "../utils";

interface UseBrowserProfilesResult {
  profiles: ResolvedBrowserProfile[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useBrowserProfiles(): UseBrowserProfilesResult {
  const [profiles, setProfiles] = useState<ResolvedBrowserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hasShownWarningToast = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const [scanResult, metadataMap] = await Promise.all([
        detectBrowserProfiles(),
        getProfileMetadataMap(),
      ]);

      const mergedProfiles = scanResult.profiles.map((profile) => {
        const metadata = metadataMap[profile.id];
        const alias = metadata?.alias?.trim();
        const tags = metadata?.tags ?? [];

        return {
          ...profile,
          alias,
          tags,
          displayName: alias || profile.originalName,
        };
      });

      setProfiles(mergedProfiles);
      await maybeShowWarnings(
        scanResult.warnings,
        hasShownWarningToast.current,
      );
      hasShownWarningToast.current =
        hasShownWarningToast.current || scanResult.warnings.length > 0;
    } catch (error) {
      setProfiles([]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Nao Foi Possivel Carregar Os Perfis",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profiles, isLoading, refresh };
}

async function maybeShowWarnings(
  warnings: ScanWarning[],
  alreadyShown: boolean,
): Promise<void> {
  if (alreadyShown || warnings.length === 0) {
    return;
  }

  const sample = warnings[0];
  const baseMessage = sample.path
    ? `${sample.message}: ${sample.path}`
    : sample.message;

  await showToast({
    style: Toast.Style.Failure,
    title: "Alguns Perfis Foram Ignorados",
    message:
      warnings.length === 1
        ? baseMessage
        : `${baseMessage} (+${warnings.length - 1} more)`,
  });
}
