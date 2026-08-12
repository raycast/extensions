import { useState, useEffect } from "react";
import {
  Grid,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  Detail,
  getSelectedFinderItems,
  LocalStorage,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import * as fs from "fs";
import * as path from "path";
import {
  parseRepoUrl,
  isImageFile,
  uploadFileToRepo,
  deleteFileFromRepo,
  getDefaultBranch,
  validateGitHubToken,
  type RepoInfo,
} from "./utils/github";

interface CachedFiles {
  files: RepoFile[];
  timestamp: number;
  repoKey: string;
}

interface RepoFile {
  name: string;
  path: string;
  url: string;
  cdnUrl: string;
  githubUrl?: string; // Optional for backward compatibility with cached data
  size: number;
  sha: string;
  isImage?: boolean; // Optional for backward compatibility with cached data
}

function generateCDNUrl(owner: string, repo: string, branch: string, path: string): string {
  // Use jsDelivr CDN for better performance and reliability
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
}

function generateRawUrl(owner: string, repo: string, branch: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function generateGitHubUrl(owner: string, repo: string, branch: string, path: string): string {
  return `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
}

async function fetchFilesFromRepo(
  repoInfo: RepoInfo,
  path: string = "",
  tryFallbackBranch: boolean = true,
  githubToken?: string,
): Promise<RepoFile[]> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (githubToken) {
    headers.Authorization = `token ${githubToken}`;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    if (response.status === 404) {
      // Try fallback branch if main/master mismatch
      if (tryFallbackBranch && branch === "main") {
        return fetchFilesFromRepo({ ...repoInfo, branch: "master" }, path, false, githubToken);
      } else if (tryFallbackBranch && branch === "master") {
        return fetchFilesFromRepo({ ...repoInfo, branch: "main" }, path, false, githubToken);
      }

      // Provide helpful error message about which branches were tried
      const triedBranches =
        branch === "main" || branch === "master" ? "both 'main' and 'master' branches" : `'${branch}' branch`;
      throw new Error(
        `Repository or path not found. Tried ${triedBranches}. Please verify the repository exists and the branch name is correct.`,
      );
    }
    if (response.status === 403) {
      const rateLimitReset = response.headers.get("x-ratelimit-reset");

      let errorMessage = "GitHub API rate limit exceeded.";

      if (rateLimitReset) {
        const resetTime = new Date(parseInt(rateLimitReset) * 1000);
        const now = new Date();
        const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / 1000 / 60);
        errorMessage += ` Rate limit resets in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? "s" : ""}.`;
      }

      if (!githubToken) {
        errorMessage += " Add a GitHub token in preferences to increase limits (60/hour → 5000/hour).";
      }

      throw new Error(errorMessage);
    }
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  const data = await response.json();
  const files: RepoFile[] = [];

  // Handle both single file and directory responses
  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    if (item.type === "file") {
      const isImage = isImageFile(item.name);
      files.push({
        name: item.name,
        path: item.path,
        url: item.download_url || generateRawUrl(owner, repo, branch, item.path),
        cdnUrl: generateCDNUrl(owner, repo, branch, item.path),
        githubUrl: generateGitHubUrl(owner, repo, branch, item.path),
        size: item.size || 0,
        sha: item.sha,
        isImage,
      });
    } else if (item.type === "dir") {
      // Recursively fetch files from subdirectories
      const subFiles = await fetchFilesFromRepo(repoInfo, item.path, true, githubToken);
      files.push(...subFiles);
    }
  }

  return files;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ViewImages() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultRepo = preferences.defaultRepo?.trim() || "";
  const githubToken = preferences.githubToken?.trim();
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading to prevent empty state flash
  const [error, setError] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [cachedData, setCachedData] = useCachedState<CachedFiles | null>("cached-files", null);

  // Listen for cache invalidation from upload/delete commands
  useEffect(() => {
    const checkCacheInvalidation = async () => {
      const cacheCleared = await LocalStorage.getItem("cache-cleared");
      if (cacheCleared) {
        await LocalStorage.removeItem("cache-cleared");
        // Clear cache immediately and trigger refresh
        setCachedData(null);

        // Immediately trigger a refresh if we have repo info
        if (repoInfo) {
          setIsLoading(true);
          fetchFilesFromRepo(repoInfo, "", true, githubToken)
            .then((fetchedFiles) => {
              setFiles(fetchedFiles);
              setCachedData({
                files: fetchedFiles,
                timestamp: Date.now(),
                repoKey: `${repoInfo.owner}/${repoInfo.repo}@${repoInfo.branch}`,
              });
              setIsLoading(false);
            })
            .catch(() => {
              setIsLoading(false);
            });
        }
      }
    };

    const interval = setInterval(checkCacheInvalidation, 500);
    // Also check immediately on mount
    checkCacheInvalidation();
    return () => clearInterval(interval);
  }, [setCachedData, defaultRepo, githubToken, repoInfo]);

  // Load files from configured repository
  useEffect(() => {
    if (!defaultRepo) {
      setError("No repository configured. Please set a default repository in extension preferences.");
      setFiles([]);
      setIsLoading(false);
      setRepoInfo(null);
      return;
    }

    const parsed = parseRepoUrl(defaultRepo);
    if (!parsed) {
      setError("Invalid repository URL in preferences. Use format: owner/repo or https://github.com/owner/repo");
      setFiles([]);
      setIsLoading(false);
      setRepoInfo(null);
      return;
    }

    // Always show loading state while checking cache invalidation
    setIsLoading(true);
    setError(null);

    // Check if cache was cleared first (before showing cached data)
    const checkCacheAndLoad = async () => {
      // Check if branch was explicitly set in URL (has /tree/ or /blob/)
      const hasBranchInUrl = defaultRepo.includes("/tree/") || defaultRepo.includes("/blob/");

      // If no explicit branch, fetch the actual default branch from GitHub
      let repoInfoWithBranch = parsed;
      if (!hasBranchInUrl) {
        const actualBranch = await getDefaultBranch(parsed.owner, parsed.repo, githubToken);
        repoInfoWithBranch = { ...parsed, branch: actualBranch };
      }

      const repoKey = `${repoInfoWithBranch.owner}/${repoInfoWithBranch.repo}@${repoInfoWithBranch.branch}`;
      setRepoInfo(repoInfoWithBranch);
      const cacheCleared = await LocalStorage.getItem("cache-cleared");
      if (cacheCleared) {
        // Cache was cleared, fetch fresh data
        // Keep showing old files while loading new ones
        await LocalStorage.removeItem("cache-cleared");
        setCachedData(null);
        fetchFilesFromRepo(repoInfoWithBranch, "", true, githubToken)
          .then((fetchedFiles) => {
            setFiles(fetchedFiles);
            setCachedData({
              files: fetchedFiles,
              timestamp: Date.now(),
              repoKey,
            });
            setIsLoading(false);
            if (fetchedFiles.length === 0) {
              showToast({
                style: Toast.Style.Failure,
                title: "No files found",
                message: "No files found in this repository",
              });
            }
          })
          .catch((err) => {
            setError(err.message);
            setIsLoading(false);
            // Only clear files on error if we don't have cached data to show
            if (!cachedData || cachedData.repoKey !== repoKey) {
              setFiles([]);
            }
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: err.message,
            });
          });
        return;
      }

      // Cache wasn't cleared, check cache first
      if (cachedData && cachedData.repoKey === repoKey) {
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge < CACHE_DURATION) {
          // Show cached data immediately (no loading flicker)
          setFiles(cachedData.files);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      // If we have files from cache but they're stale, keep showing them while loading
      if (cachedData && cachedData.repoKey === repoKey && cachedData.files.length > 0) {
        setFiles(cachedData.files);
      }

      // No valid cache, fetch fresh
      fetchFilesFromRepo(repoInfoWithBranch, "", true, githubToken)
        .then((fetchedFiles) => {
          setFiles(fetchedFiles);
          setCachedData({
            files: fetchedFiles,
            timestamp: Date.now(),
            repoKey,
          });
          setIsLoading(false);
          if (fetchedFiles.length === 0) {
            showToast({
              style: Toast.Style.Failure,
              title: "No files found",
              message: "No files found in this repository",
            });
          }
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
          setFiles([]);
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: err.message,
          });
        });
    };

    checkCacheAndLoad();
  }, [defaultRepo, githubToken, cachedData, setCachedData]);

  const refreshFiles = () => {
    setCachedData(null);
    if (defaultRepo) {
      const parsed = parseRepoUrl(defaultRepo);
      if (parsed) {
        setIsLoading(true);
        setError(null);
        fetchFilesFromRepo(parsed, "", true, githubToken)
          .then((fetchedFiles) => {
            setFiles(fetchedFiles);
            setCachedData({
              files: fetchedFiles,
              timestamp: Date.now(),
              repoKey: `${parsed.owner}/${parsed.repo}@${parsed.branch}`,
            });
            setIsLoading(false);
          })
          .catch((err) => {
            setError(err.message);
            setIsLoading(false);
            setFiles([]);
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: err.message,
            });
          });
      }
    }
  };

  const handleUploadFiles = async () => {
    if (!githubToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "GitHub Token Required",
        message: "Please add a GitHub token in preferences to upload files.",
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

    if (!repoInfo) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Repository",
        message: "Please configure a repository first.",
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

      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Uploading files...",
        message: `Uploading ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""}`,
      });

      const uploadPromises = selectedItems.map(async (file) => {
        const fileName = file.path.split("/").pop() || "file";
        const targetPath = fileName;
        await uploadFileToRepo(repoInfo, file.path, targetPath, githubToken);
      });

      await Promise.all(uploadPromises);

      // Clear cache and refresh
      await LocalStorage.setItem("cache-cleared", Date.now().toString());
      setCachedData(null);
      toast.style = Toast.Style.Success;
      toast.title = "Upload Complete";
      toast.message = `Uploaded ${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""}`;
      refreshFiles();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Upload Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (file: RepoFile) => {
    if (!githubToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "GitHub Token Required",
        message: "Please add a GitHub token in preferences to delete files.",
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

    if (!repoInfo) {
      return;
    }

    try {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting file...",
        message: file.name,
      });

      await deleteFileFromRepo(repoInfo, file.path, file.sha, githubToken);

      // Clear cache and refresh
      await LocalStorage.setItem("cache-cleared", Date.now().toString());
      setCachedData(null);
      setIsLoading(false);
      toast.style = Toast.Style.Success;
      toast.title = "File Deleted";
      toast.message = file.name;
      refreshFiles();
    } catch (error) {
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Delete Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDownloadFile = async (file: RepoFile) => {
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading file...",
        message: file.name,
      });

      // Fetch the file
      const response = await fetch(file.cdnUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to Downloads folder
      const downloadsPath = path.join(process.env.HOME || "", "Downloads");
      const filePath = path.join(downloadsPath, file.name);

      // Handle file name conflicts
      let finalPath = filePath;
      let counter = 1;
      while (fs.existsSync(finalPath)) {
        const ext = path.extname(file.name);
        const nameWithoutExt = path.basename(file.name, ext);
        finalPath = path.join(downloadsPath, `${nameWithoutExt} ${counter}${ext}`);
        counter++;
      }

      fs.writeFileSync(finalPath, buffer);

      toast.style = Toast.Style.Success;
      toast.title = "Download Complete";
      toast.message = `Saved to Downloads/${path.basename(finalPath)}`;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Download Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarPlaceholder={
        repoInfo
          ? `Search ${files.length} file${files.length !== 1 ? "s" : ""} in ${repoInfo.owner}/${repoInfo.repo}...`
          : "Search files..."
      }
      searchBarAccessory={
        repoInfo ? (
          <Grid.Dropdown tooltip="Repository" defaultValue="info">
            <Grid.Dropdown.Item title={`${repoInfo.owner}/${repoInfo.repo}`} value="info" icon={Icon.Code} />
          </Grid.Dropdown>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Manage Files">
            <Action
              title="Upload Files from Finder"
              icon={Icon.Plus}
              onAction={handleUploadFiles}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refreshFiles}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {error ? (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Repository"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Upload Files from Finder"
                icon={Icon.Plus}
                onAction={handleUploadFiles}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : files.length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon={Icon.Document}
          title="No files found"
          description={`No files found in ${repoInfo?.owner}/${repoInfo?.repo}`}
          actions={
            <ActionPanel>
              <Action
                title="Upload Files from Finder"
                icon={Icon.Plus}
                onAction={handleUploadFiles}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshFiles}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        files.map((file) => (
          <Grid.Item
            key={file.sha}
            content={(file.isImage ?? isImageFile(file.name)) ? { source: file.cdnUrl } : Icon.Document}
            title={file.name}
            subtitle={`${(file.size / 1024).toFixed(1)} KB`}
            keywords={[file.name, file.path]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={file.githubUrl || file.cdnUrl} title="Open in Browser" />
                  <Action
                    title="Download File"
                    icon={Icon.Download}
                    onAction={() => handleDownloadFile(file)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                  <Action.CopyToClipboard
                    content={file.cdnUrl}
                    title="Copy CDN URL"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    content={file.url}
                    title="Copy Raw URL"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                {githubToken && (
                  <ActionPanel.Section>
                    <Action
                      title="Delete File"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteFile(file)}
                    />
                  </ActionPanel.Section>
                )}
                <Action.Push
                  title="View Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={
                    <Detail
                      markdown={
                        (file.isImage ?? isImageFile(file.name))
                          ? `![${file.name}](${file.cdnUrl})`
                          : `# ${file.name}\n\nFile: ${file.name}`
                      }
                      navigationTitle={file.name}
                      metadata={
                        <Detail.Metadata>
                          <Detail.Metadata.Label title="File Name" text={file.name} />
                          <Detail.Metadata.Label title="Path" text={file.path} />
                          <Detail.Metadata.Label title="Size" text={`${(file.size / 1024).toFixed(2)} KB`} />
                          <Detail.Metadata.Label
                            title="Type"
                            text={(file.isImage ?? isImageFile(file.name)) ? "Image" : "File"}
                          />
                          <Detail.Metadata.Separator />
                          {file.githubUrl && (
                            <Detail.Metadata.Link title="GitHub URL" target={file.githubUrl} text={file.githubUrl} />
                          )}
                          <Detail.Metadata.Link title="CDN URL" target={file.cdnUrl} text={file.cdnUrl} />
                          <Detail.Metadata.Link title="Raw URL" target={file.url} text={file.url} />
                        </Detail.Metadata>
                      }
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser url={file.githubUrl || file.cdnUrl} title="Open in Browser" />
                          <Action.CopyToClipboard content={file.cdnUrl} title="Copy CDN URL" />
                          <Action.CopyToClipboard content={file.url} title="Copy Raw URL" />
                          {file.githubUrl && (
                            <Action.CopyToClipboard content={file.githubUrl} title="Copy GitHub URL" />
                          )}
                        </ActionPanel>
                      }
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
