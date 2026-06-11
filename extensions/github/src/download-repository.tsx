import fs from "fs";
import os from "os";
import path from "path";

import { Action, ActionPanel, Form, LocalStorage, showToast, Toast, Clipboard, open } from "@raycast/api";
import { useState, useEffect } from "react";

import { getGitHubClient } from "./api/githubClient";
import { downloadGitHubContent } from "./helpers/download";
import { withGitHubClient } from "./helpers/withGithubClient";

function DownloadRepository() {
  const [downloadPath, setDownloadPath] = useState<string[]>([]);
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      // Load last download path
      const storedPath = await LocalStorage.getItem<string>("lastDownloadPath");
      if (storedPath && fs.existsSync(storedPath)) {
        setDownloadPath([storedPath]);
      } else {
        const homeDir = os.homedir();
        const downloadsDir = path.join(homeDir, "Downloads");
        if (fs.existsSync(downloadsDir)) {
          setDownloadPath([downloadsDir]);
        }
      }

      // Auto-load URL from clipboard
      const clipboardText = await Clipboard.readText();
      if (clipboardText && isValidGitHubUrl(clipboardText)) {
        setUrl(clipboardText);
      }
      setIsInitialized(true);
    }
    init();
  }, []);

  function isValidGitHubUrl(value: string): boolean {
    try {
      const urlObj = new URL(value);
      return urlObj.hostname === "github.com";
    } catch {
      return false;
    }
  }

  function validateUrl(value: string | undefined) {
    if (!value) return "GitHub URL is required";
    try {
      const urlObj = new URL(value);
      if (urlObj.hostname !== "github.com") return "Must be a valid GitHub URL (github.com)";

      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return "Invalid repository URL (needs owner/repo)";
    } catch {
      return "Invalid URL format";
    }
    return undefined;
  }

  async function handleSubmit(values: { url: string; downloadPath: string[] }) {
    const error = validateUrl(values.url);
    if (error) {
      setUrlError(error);
      return;
    }

    if (!values.downloadPath || values.downloadPath.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Please select a download location" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Download...",
    });

    try {
      const { token } = getGitHubClient();
      const destPath = values.downloadPath[0];
      await LocalStorage.setItem("lastDownloadPath", destPath);

      const resultPath = await downloadGitHubContent(values.url, destPath, token, (msg) => {
        toast.message = msg;
      });

      toast.style = Toast.Style.Success;
      toast.title = "Download Complete";
      toast.message = `Saved to ${path.basename(resultPath)}`;

      toast.primaryAction = {
        title: "Open in Finder",
        onAction: () => open(resultPath),
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  if (!isInitialized) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="GitHub URL"
        placeholder="https://github.com/owner/repo/tree/main/folder"
        value={url}
        error={urlError}
        onChange={(value) => {
          setUrl(value);
          if (urlError) setUrlError(undefined);
        }}
      />
      <Form.FilePicker
        id="downloadPath"
        title="Download Location"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={downloadPath}
        onChange={setDownloadPath}
      />
    </Form>
  );
}

export default withGitHubClient(DownloadRepository);
