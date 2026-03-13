import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { withGitHubOAuth } from "./lib/auth";
import { syncAllGists } from "./lib/sync";

async function RefreshGists() {
  await closeMainWindow();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Rebuilding gist content index",
    message: "Refreshing gists and file contents",
  });

  try {
    const { result } = await syncAllGists();
    toast.style =
      result.failedFileFetches > 0 ? Toast.Style.Success : Toast.Style.Success;
    toast.title = "Content index rebuilt";
    toast.message = `${result.gistCount} gists, ${result.fileCount} files indexed`;

    if (result.failedFileFetches > 0) {
      await showHUD(
        `Rebuilt content index for ${result.gistCount} gists with ${result.failedFileFetches} file fetch warnings`,
      );
      return;
    }

    await showHUD(`Rebuilt content index for ${result.gistCount} gists`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Refresh failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

export default withGitHubOAuth(RefreshGists);
