import type { Toast } from "@raycast/api";
import { formatByteSize } from "./byte-size";
import type { ResolvedMermaidInput } from "./mermaid-input";
import type { ManualCommandSession } from "./manual-command-session";

export interface ManualCommandBrowserDownloadFlow {
  run: () => Promise<void>;
}

interface ManualCommandBrowserDownloadFlowServices {
  installManagedBrowser: (options: {
    onProgress?: (downloadedBytes: number, totalBytes: number) => void;
  }) => Promise<{ source: string }>;
  getManagedBrowserSupportRoot: (supportPath: string) => string;
  notifyManagedBrowserDownloadStarted: () => Promise<Toast>;
  notifyManagedBrowserDownloadProgress: (toast: Toast, message: string) => void;
  notifyManagedBrowserDownloadSuccess: (toast: Toast, source: string, supportRoot: string) => void;
  notifyManagedBrowserDownloadFailure: (error: unknown) => Promise<void>;
  logOperationalError: (event: string, error: unknown, metadata: Record<string, unknown>) => void;
  runResolvedInput: (resolvedInput: ResolvedMermaidInput) => Promise<void>;
}

interface CreateManualCommandBrowserDownloadFlowOptions {
  session: Pick<ManualCommandSession, "getPendingInput">;
  environmentSupportPath: string;
  services: ManualCommandBrowserDownloadFlowServices;
}

export function createManualCommandBrowserDownloadFlow(
  options: CreateManualCommandBrowserDownloadFlowOptions,
): ManualCommandBrowserDownloadFlow {
  const { session, environmentSupportPath, services } = options;

  return {
    run: async () => {
      const pendingInput = session.getPendingInput();
      if (!pendingInput) {
        return;
      }

      try {
        const toast = await services.notifyManagedBrowserDownloadStarted();
        const installResult = await services.installManagedBrowser({
          onProgress: (downloadedBytes, totalBytes) => {
            services.notifyManagedBrowserDownloadProgress(
              toast,
              `${formatByteSize(downloadedBytes)} / ${formatByteSize(totalBytes)}`,
            );
          },
        });

        services.notifyManagedBrowserDownloadSuccess(
          toast,
          installResult.source,
          services.getManagedBrowserSupportRoot(environmentSupportPath),
        );

        await services.runResolvedInput(pendingInput);
      } catch (error) {
        services.logOperationalError("download-managed-browser-failed", error, { source: "managed" });
        await services.notifyManagedBrowserDownloadFailure(error);
      }
    },
  };
}
