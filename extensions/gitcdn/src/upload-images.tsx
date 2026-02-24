import { getPreferenceValues, showToast, Toast, getSelectedFinderItems, LocalStorage } from "@raycast/api";
import { parseRepoUrl, uploadFileToRepo, validateGitHubToken } from "./utils/github";

export default async function UploadFiles() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultRepo = preferences.defaultRepo?.trim() || "";
  const githubToken = preferences.githubToken?.trim();

  if (!githubToken) {
    showToast({
      style: Toast.Style.Failure,
      title: "GitHub Token Required",
      message: "Please add a GitHub token in extension preferences to upload files.",
    });
    return;
  }

  const tokenValidation = validateGitHubToken(githubToken);
  if (!tokenValidation.valid) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid GitHub Token",
      message: tokenValidation.error || "Please check your GitHub token in preferences.",
    });
    return;
  }

  if (!defaultRepo) {
    showToast({
      style: Toast.Style.Failure,
      title: "No Repository Configured",
      message: "Please set a default repository in extension preferences.",
    });
    return;
  }

  const parsed = parseRepoUrl(defaultRepo);
  if (!parsed) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Repository URL",
      message: "Please check your repository URL in preferences.",
    });
    return;
  }

  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Files Selected",
        message: "Please select files in Finder first.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading files...",
      message: `Uploading ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""}`,
    });

    const uploadPromises = selectedItems.map(async (file) => {
      const fileName = file.path.split("/").pop() || "file";
      const targetPath = fileName;
      await uploadFileToRepo(parsed, file.path, targetPath, githubToken);
    });

    await Promise.all(uploadPromises);

    // Signal to view component that cache was cleared (set before clearing)
    await LocalStorage.setItem("cache-cleared", Date.now().toString());
    // Clear cache so the view refreshes with new files
    await LocalStorage.removeItem("cached-files");

    toast.style = Toast.Style.Success;
    toast.title = "Upload Complete";
    toast.message = `Uploaded ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""}`;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Upload Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
