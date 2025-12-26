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
  showHUD,
  getSelectedFinderItems,
  LocalStorage,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import * as fs from "fs";
import * as path from "path";

interface Preferences {
  defaultRepo?: string;
  githubToken?: string;
}

interface CachedImages {
  images: ImageFile[];
  timestamp: number;
  repoKey: string;
}

interface ImageFile {
  name: string;
  path: string;
  url: string;
  cdnUrl: string;
  size: number;
  sha: string;
}

interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp"];

function parseRepoUrl(url: string): RepoInfo | null {
  // Handle various GitHub URL formats:
  // https://github.com/owner/repo
  // https://github.com/owner/repo/tree/branch
  // https://github.com/owner/repo/blob/branch/path
  // owner/repo
  const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?(?:\/blob\/([^/]+))?/);
  if (githubMatch) {
    return {
      owner: githubMatch[1],
      repo: githubMatch[2],
      branch: githubMatch[3] || githubMatch[4] || "main",
    };
  }

  // Handle owner/repo format
  const simpleMatch = url.match(/^([^/]+)\/([^/]+)$/);
  if (simpleMatch) {
    return {
      owner: simpleMatch[1],
      repo: simpleMatch[2],
      branch: "main",
    };
  }

  return null;
}

function generateCDNUrl(owner: string, repo: string, branch: string, path: string): string {
  // Use jsDelivr CDN for better performance and reliability
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
}

function generateRawUrl(owner: string, repo: string, branch: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function isImageFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// GitHub API functions for file operations
async function uploadImageToRepo(
  repoInfo: RepoInfo,
  filePath: string,
  targetPath: string,
  githubToken: string,
): Promise<void> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

  // Read file and encode to base64
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString("base64");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Add image: ${targetPath}`,
      content: base64Content,
      branch: branch,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 422 && error.message?.includes("already exists")) {
      // File exists, try to update it
      return updateImageInRepo(repoInfo, filePath, targetPath, githubToken);
    }
    throw new Error(error.message || `Failed to upload: ${response.statusText}`);
  }
}

async function updateImageInRepo(
  repoInfo: RepoInfo,
  filePath: string,
  targetPath: string,
  githubToken: string,
): Promise<void> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

  // Get current file SHA
  const getResponse = await fetch(`${apiUrl}?ref=${branch}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
    },
  });

  if (!getResponse.ok) {
    throw new Error(`Failed to get file info: ${getResponse.statusText}`);
  }

  const fileInfo = await getResponse.json();
  const sha = fileInfo.sha;

  // Read file and encode to base64
  const fileContent = fs.readFileSync(filePath);
  const base64Content = fileContent.toString("base64");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Update image: ${targetPath}`,
      content: base64Content,
      branch: branch,
      sha: sha,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update: ${response.statusText}`);
  }
}

async function deleteImageFromRepo(
  repoInfo: RepoInfo,
  imagePath: string,
  sha: string,
  githubToken: string,
): Promise<void> {
  const { owner, repo, branch } = repoInfo;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${imagePath}`;

  const response = await fetch(apiUrl, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Delete image: ${imagePath}`,
      branch: branch,
      sha: sha,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to delete: ${response.statusText}`);
  }
}

async function fetchImagesFromRepo(
  repoInfo: RepoInfo,
  path: string = "",
  tryFallbackBranch: boolean = true,
  githubToken?: string,
): Promise<ImageFile[]> {
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
        return fetchImagesFromRepo({ ...repoInfo, branch: "master" }, path, false, githubToken);
      } else if (tryFallbackBranch && branch === "master") {
        return fetchImagesFromRepo({ ...repoInfo, branch: "main" }, path, false, githubToken);
      }
      throw new Error("Repository or path not found. The branch might not exist.");
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
  const images: ImageFile[] = [];

  // Handle both single file and directory responses
  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    if (item.type === "file" && isImageFile(item.name)) {
      images.push({
        name: item.name,
        path: item.path,
        url: item.download_url || generateRawUrl(owner, repo, branch, item.path),
        cdnUrl: generateCDNUrl(owner, repo, branch, item.path),
        size: item.size || 0,
        sha: item.sha,
      });
    } else if (item.type === "dir") {
      // Recursively fetch images from subdirectories
      const subImages = await fetchImagesFromRepo(repoInfo, item.path, true, githubToken);
      images.push(...subImages);
    }
  }

  return images;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ViewImages() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultRepo = preferences.defaultRepo?.trim() || "";
  const githubToken = preferences.githubToken?.trim();
  const [searchText, setSearchText] = useState<string>("");
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading to prevent empty state flash
  const [error, setError] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [cachedData, setCachedData] = useCachedState<CachedImages | null>("cached-images", null);

  // Listen for cache invalidation from upload/delete commands
  useEffect(() => {
    const checkCacheInvalidation = async () => {
      const cacheCleared = await LocalStorage.getItem("cache-cleared");
      if (cacheCleared) {
        await LocalStorage.removeItem("cache-cleared");
        // Clear cache immediately and trigger refresh
        setCachedData(null);

        // Immediately trigger a refresh if we have repo info
        if (defaultRepo) {
          const parsed = parseRepoUrl(defaultRepo);
          if (parsed && repoInfo) {
            setIsLoading(true);
            fetchImagesFromRepo(parsed, "", true, githubToken)
              .then((fetchedImages) => {
                setImages(fetchedImages);
                setCachedData({
                  images: fetchedImages,
                  timestamp: Date.now(),
                  repoKey: `${parsed.owner}/${parsed.repo}@${parsed.branch}`,
                });
                setIsLoading(false);
              })
              .catch(() => {
                setIsLoading(false);
              });
          }
        }
      }
    };

    const interval = setInterval(checkCacheInvalidation, 100);
    // Also check immediately on mount
    checkCacheInvalidation();
    return () => clearInterval(interval);
  }, [setCachedData, defaultRepo, githubToken, repoInfo]);

  // Load images from configured repository
  useEffect(() => {
    if (!defaultRepo) {
      setError("No repository configured. Please set a default repository in extension preferences.");
      setImages([]);
      setIsLoading(false);
      setRepoInfo(null);
      return;
    }

    const parsed = parseRepoUrl(defaultRepo);
    if (!parsed) {
      setError("Invalid repository URL in preferences. Use format: owner/repo or https://github.com/owner/repo");
      setImages([]);
      setIsLoading(false);
      setRepoInfo(null);
      return;
    }

    const repoKey = `${parsed.owner}/${parsed.repo}@${parsed.branch}`;

    // Always show loading state while checking cache invalidation
    setRepoInfo(parsed);
    setIsLoading(true);
    setError(null);

    // Check if cache was cleared first (before showing cached data)
    const checkCacheAndLoad = async () => {
      const cacheCleared = await LocalStorage.getItem("cache-cleared");
      if (cacheCleared) {
        // Cache was cleared, fetch fresh data
        // Keep showing old images while loading new ones
        await LocalStorage.removeItem("cache-cleared");
        setCachedData(null);
        fetchImagesFromRepo(parsed, "", true, githubToken)
          .then((fetchedImages) => {
            setImages(fetchedImages);
            setCachedData({
              images: fetchedImages,
              timestamp: Date.now(),
              repoKey,
            });
            setIsLoading(false);
            if (fetchedImages.length === 0) {
              showToast({
                style: Toast.Style.Failure,
                title: "No images found",
                message: "No image files found in this repository",
              });
            }
          })
          .catch((err) => {
            setError(err.message);
            setIsLoading(false);
            // Only clear images on error if we don't have cached data to show
            if (!cachedData || cachedData.repoKey !== repoKey) {
              setImages([]);
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
          setImages(cachedData.images);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      // If we have images from cache but they're stale, keep showing them while loading
      if (cachedData && cachedData.repoKey === repoKey && cachedData.images.length > 0) {
        setImages(cachedData.images);
      }

      // No valid cache, fetch fresh
      fetchImagesFromRepo(parsed, "", true, githubToken)
        .then((fetchedImages) => {
          setImages(fetchedImages);
          setCachedData({
            images: fetchedImages,
            timestamp: Date.now(),
            repoKey,
          });
          setIsLoading(false);
          if (fetchedImages.length === 0) {
            showToast({
              style: Toast.Style.Failure,
              title: "No images found",
              message: "No image files found in this repository",
            });
          }
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
          setImages([]);
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: err.message,
          });
        });
    };

    checkCacheAndLoad();

    setRepoInfo(parsed);
    setIsLoading(true);
    setError(null);
    fetchImagesFromRepo(parsed, "", true, githubToken)
      .then((fetchedImages) => {
        setImages(fetchedImages);
        setCachedData({
          images: fetchedImages,
          timestamp: Date.now(),
          repoKey,
        });
        setIsLoading(false);
        if (fetchedImages.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "No images found",
            message: "No image files found in this repository",
          });
        }
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
        setImages([]);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: err.message,
        });
      });
  }, [defaultRepo, githubToken, cachedData, setCachedData]);

  const refreshImages = () => {
    setCachedData(null);
    if (defaultRepo) {
      const parsed = parseRepoUrl(defaultRepo);
      if (parsed) {
        setIsLoading(true);
        setError(null);
        fetchImagesFromRepo(parsed, "", true, githubToken)
          .then((fetchedImages) => {
            setImages(fetchedImages);
            setCachedData({
              images: fetchedImages,
              timestamp: Date.now(),
              repoKey: `${parsed.owner}/${parsed.repo}@${parsed.branch}`,
            });
            setIsLoading(false);
          })
          .catch((err) => {
            setError(err.message);
            setIsLoading(false);
            setImages([]);
            showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: err.message,
            });
          });
      }
    }
  };

  const handleUploadImages = async () => {
    if (!githubToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "GitHub Token Required",
        message: "Please add a GitHub token in preferences to upload images.",
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
      const imageFiles = selectedItems.filter((item) => {
        return isImageFile(item.path);
      });

      if (imageFiles.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No Images Selected",
          message: "Please select image files in Finder first.",
        });
        return;
      }

      setIsLoading(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Uploading images...",
        message: `Uploading ${imageFiles.length} image${imageFiles.length !== 1 ? "s" : ""}`,
      });

      const uploadPromises = imageFiles.map(async (file) => {
        const fileName = file.path.split("/").pop() || "image";
        const targetPath = fileName;
        await uploadImageToRepo(repoInfo, file.path, targetPath, githubToken);
      });

      await Promise.all(uploadPromises);

      // Clear cache and refresh
      setCachedData(null);
      showHUD(`Uploaded ${imageFiles.length} image${imageFiles.length !== 1 ? "s" : ""}`);
      refreshImages();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Upload Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (image: ImageFile) => {
    if (!githubToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "GitHub Token Required",
        message: "Please add a GitHub token in preferences to delete images.",
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
        title: "Deleting image...",
        message: image.name,
      });

      await deleteImageFromRepo(repoInfo, image.path, image.sha, githubToken);

      // Clear cache and refresh
      setCachedData(null);
      setIsLoading(false);
      toast.hide();

      showHUD(`Deleted ${image.name}`);
      refreshImages();
    } catch (error) {
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "Delete Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDownloadImage = async (image: ImageFile) => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Downloading image...",
        message: image.name,
      });

      // Fetch the image
      const response = await fetch(image.cdnUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to Downloads folder
      const downloadsPath = path.join(process.env.HOME || "", "Downloads");
      const filePath = path.join(downloadsPath, image.name);

      // Handle file name conflicts
      let finalPath = filePath;
      let counter = 1;
      while (fs.existsSync(finalPath)) {
        const ext = path.extname(image.name);
        const nameWithoutExt = path.basename(image.name, ext);
        finalPath = path.join(downloadsPath, `${nameWithoutExt} ${counter}${ext}`);
        counter++;
      }

      fs.writeFileSync(finalPath, buffer);

      showHUD(`Downloaded ${image.name}`);
      showToast({
        style: Toast.Style.Success,
        title: "Download Complete",
        message: `Saved to Downloads/${path.basename(finalPath)}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Download Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Filter images based on search text
  const filteredImages = searchText.trim()
    ? images.filter(
        (image) =>
          image.name.toLowerCase().includes(searchText.toLowerCase()) ||
          image.path.toLowerCase().includes(searchText.toLowerCase()),
      )
    : images;

  if (error && !defaultRepo) {
    return (
      <Grid
        columns={5}
        inset={Grid.Inset.Large}
        searchBarPlaceholder="Search images..."
        onSearchTextChange={setSearchText}
      >
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="No Repository Configured"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      searchBarPlaceholder={
        repoInfo
          ? `Search ${filteredImages.length} image${filteredImages.length !== 1 ? "s" : ""} in ${repoInfo.owner}/${repoInfo.repo}...`
          : "Search images..."
      }
      searchBarAccessory={
        repoInfo ? (
          <Grid.Dropdown tooltip="Repository" defaultValue="info">
            <Grid.Dropdown.Item title={`${repoInfo.owner}/${repoInfo.repo}`} value="info" icon={Icon.Code} />
          </Grid.Dropdown>
        ) : undefined
      }
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Manage Images">
            <Action
              title="Upload Images from Finder"
              icon={Icon.Plus}
              onAction={handleUploadImages}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refreshImages}
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
                title="Upload Images from Finder"
                icon={Icon.Plus}
                onAction={handleUploadImages}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : filteredImages.length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon={Icon.Image}
          title={searchText.trim() ? "No matching images" : "No images found"}
          description={
            searchText.trim()
              ? `No images match "${searchText}" in ${repoInfo?.owner}/${repoInfo?.repo}`
              : `No image files found in ${repoInfo?.owner}/${repoInfo?.repo}`
          }
          actions={
            <ActionPanel>
              <Action
                title="Upload Images from Finder"
                icon={Icon.Plus}
                onAction={handleUploadImages}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refreshImages}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        filteredImages.map((image) => (
          <Grid.Item
            key={image.sha}
            content={image.cdnUrl}
            title={image.name}
            subtitle={`${(image.size / 1024).toFixed(1)} KB`}
            keywords={[image.name, image.path]}
            quickLook={{ name: image.name, path: image.cdnUrl }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={image.cdnUrl} title="Open in Browser" />
                  <Action
                    title="Download Image"
                    icon={Icon.Download}
                    onAction={() => handleDownloadImage(image)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                  <Action.CopyToClipboard
                    content={image.cdnUrl}
                    title="Copy CDN URL"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    content={image.url}
                    title="Copy Raw URL"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
                </ActionPanel.Section>
                {githubToken && (
                  <ActionPanel.Section>
                    <Action
                      title="Delete Image"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteImage(image)}
                    />
                  </ActionPanel.Section>
                )}
                <Action.Push
                  title="View Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={
                    <Detail
                      markdown={`![${image.name}](${image.cdnUrl})`}
                      navigationTitle={image.name}
                      metadata={
                        <Detail.Metadata>
                          <Detail.Metadata.Label title="File Name" text={image.name} />
                          <Detail.Metadata.Label title="Path" text={image.path} />
                          <Detail.Metadata.Label title="Size" text={`${(image.size / 1024).toFixed(2)} KB`} />
                          <Detail.Metadata.Separator />
                          <Detail.Metadata.Link title="CDN URL" target={image.cdnUrl} text={image.cdnUrl} />
                          <Detail.Metadata.Link title="Raw URL" target={image.url} text={image.url} />
                        </Detail.Metadata>
                      }
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser url={image.cdnUrl} />
                          <Action.CopyToClipboard content={image.cdnUrl} title="Copy CDN URL" />
                          <Action.CopyToClipboard content={image.url} title="Copy Raw URL" />
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
