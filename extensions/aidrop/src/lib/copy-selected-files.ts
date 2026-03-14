import { getFinderCopyHelperPath } from "./helper-path";
import { getSelectedPathsInDisplayOrder } from "./selection";

interface DisplayedItem {
  path: string;
}

interface ToastPayload {
  style: "success" | "failure";
  title: string;
  message?: string;
}

interface CloseWindowOptions {
  clearRootSearch: boolean;
  popToRootType: "immediate";
}

interface FrontmostAppInfo {
  bundleId?: string;
  name: string;
  path?: string;
}

interface CopySelectedFilesOptions {
  displayedItems: readonly DisplayedItem[];
  selectedPaths: ReadonlySet<string>;
  assetsPath: string;
  frontmostApp: FrontmostAppInfo | null;
  execFile: (file: string, args: string[]) => Promise<void>;
  openFilesInApp: (app: FrontmostAppInfo, filePaths: string[]) => Promise<void>;
  showToast: (options: ToastPayload) => Promise<void>;
  closeWindow: (options: CloseWindowOptions) => Promise<void>;
}

const appOpenBundleIds = new Set([
  "com.openai.chat",
  "com.anthropic.claudefordesktop",
]);

export async function copySelectedFiles({
  displayedItems,
  selectedPaths,
  assetsPath,
  frontmostApp,
  execFile,
  openFilesInApp,
  showToast,
  closeWindow,
}: CopySelectedFilesOptions): Promise<void> {
  const pathsToCopy = getSelectedPathsInDisplayOrder(
    displayedItems,
    selectedPaths,
  );

  if (!pathsToCopy.length) {
    await showToast({
      style: "failure",
      title: "No files selected",
    });
    return;
  }

  if (frontmostApp?.bundleId === "com.openai.codex") {
    await showToast({
      style: "failure",
      title: "Codex Desktop Not Supported",
      message: "Use Codex web or drag files into the app manually",
    });
    return;
  }

  try {
    if (frontmostApp?.bundleId && appOpenBundleIds.has(frontmostApp.bundleId)) {
      await openFilesInApp(frontmostApp, pathsToCopy);

      await showToast({
        style: "success",
        title: `Sent to ${frontmostApp.name}`,
        message: `${pathsToCopy.length} file(s) handed to the app`,
      });
    } else {
      const helperPath = getFinderCopyHelperPath(assetsPath);
      await execFile(helperPath, pathsToCopy);

      await showToast({
        style: "success",
        title: "Copied like Finder",
        message: `${pathsToCopy.length} file(s) ready to paste`,
      });
    }

    await closeWindow({
      clearRootSearch: true,
      popToRootType: "immediate",
    });
  } catch (error) {
    await showToast({
      style: "failure",
      title: "Failed to copy files",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
