import {
  copyFirefoxBrowserPath,
  copySafariWebAppPath,
  getChromiumBrowserPath,
  getFocusFinderPath,
  getFocusWindowPath,
  getFocusWindowTitle,
  getQSpacePathUrls,
  getSpotifyCurrentTrack,
  getVSCodeActiveFilePath,
  getWebkitBrowserPath,
} from "./applescript-utils";
import {
  Application,
  captureException,
  Clipboard,
  FileSystemItem,
  getSelectedFinderItems,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  updateCommandMetadata,
  getPreferenceValues,
} from "@raycast/api";
import {
  copyUrlContent,
  copyWhenUnSupported,
  multiPathSeparator,
  showCopyTip,
  showLastCopy,
  showTabTitle,
  spotifyLinkTarget,
} from "../types/preferences";
import parseUrl from "parse-url";
import * as os from "node:os";
import { firefoxBrowsers, vsCodeBundleIds } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const copyFinderCurWindowPath = async () => {
  const finderPath = await getFocusFinderPath();
  return { hud: "📂 " + finderPath, path: finderPath };
};

const copyFinerFilesPath = async (fileSystemItems: FileSystemItem[]) => {
  const filePaths = fileSystemItems.map((item) => item.path);
  return {
    hud: (filePaths.length > 1 ? "📑 " : "📄 ") + filePaths[0],
    path: filePaths.join(multiPathSeparator),
  };
};

const qSpaceUrlToPath = (url: string) => {
  if (!url.startsWith("file://")) {
    return url;
  }

  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    try {
      return decodeURIComponent(url.replace(/^file:\/\/(?:localhost)?/, ""));
    } catch {
      return url;
    }
  }
};

export const copyQSpacePath = async () => {
  const { useTildeForHome } = await getPreferenceValues();
  const urls = await getQSpacePathUrls();
  const paths = urls
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean)
    .map(qSpaceUrlToPath);

  if (paths.length === 0) {
    await showFailureHUD({ title: "Nothing to Copy", style: Toast.Style.Failure });
    return "";
  }

  let path = paths.join(multiPathSeparator);
  let hud = (paths.length > 1 ? "📑 " : "📂 ") + paths[0];

  if (useTildeForHome) {
    path = path.replace(os.homedir(), "~");
    hud = hud.replace(os.homedir(), "~");
  }

  await Clipboard.copy(path);
  await showSuccessHUD(hud);
  await customUpdateCommandMetadata(path.replace(os.homedir(), "~"));
  return path;
};

export const copyFinderPath = async () => {
  const { useTildeForHome } = await getPreferenceValues();
  // get finder path
  try {
    const fileSystemItems = await getSelectedFinderItems();
    let copyPathResult;
    if (fileSystemItems.length === 0) {
      copyPathResult = await copyFinderCurWindowPath();
    } else {
      copyPathResult = await copyFinerFilesPath(fileSystemItems);
    }
    if (useTildeForHome) {
      copyPathResult.path = copyPathResult.path.replace(os.homedir(), "~");
      copyPathResult.hud = copyPathResult.hud.replace(os.homedir(), "~");
    }
    await Clipboard.copy(copyPathResult.path);
    await showSuccessHUD(copyPathResult.hud);
    await customUpdateCommandMetadata(copyPathResult.path.replace(os.homedir(), "~"));
  } catch (e) {
    console.error(String(e));
  }
};

export const copyWindowPath = async (app: Application) => {
  const { useTildeForHome } = await getPreferenceValues();
  let path = vsCodeBundleIds.includes(app.bundleId ?? "") ? await getVSCodeActiveFilePath(app) : "";
  if (isEmpty(path)) {
    path = await getFocusWindowPath(app);
  }
  if (useTildeForHome) {
    path = path.replace(os.homedir(), "~");
  }
  if (!isEmpty(path)) {
    await Clipboard.copy(path);
    await showSuccessHUD("📂 " + path);
    await customUpdateCommandMetadata(path);
  }
  return path;
};

const tryCopyBrowserUrl = async (app: Application) => {
  // get extra browser web page url
  let url = await getChromiumBrowserPath(app.name);
  if (isEmpty(url)) {
    url = await getWebkitBrowserPath(app.name);
  }
  return url;
};

export const copyUnSupportedAppContent = async (app: Application) => {
  let hudIcon: string;
  let copyContent: string;
  let shouldCopy = true;
  switch (copyWhenUnSupported) {
    case "windowTitle": {
      hudIcon = "🖥️ ";
      copyContent = await getFocusWindowTitle(app);
      break;
    }
    case "appName": {
      hudIcon = "💻 ";
      copyContent = app.name;
      break;
    }
    case "appPath": {
      hudIcon = "📂 ";
      copyContent = app.path;
      break;
    }
    case "bundleId": {
      hudIcon = "🪪 ";
      copyContent = app.bundleId ?? "";
      break;
    }
    default: {
      hudIcon = "";
      copyContent = "";
      shouldCopy = false;
      break;
    }
  }
  if (shouldCopy) {
    await Clipboard.copy(copyContent);
    await showSuccessHUD(hudIcon + copyContent);
    await customUpdateCommandMetadata(copyContent);
  } else {
    await showFailureHUD({ title: "Nothing to Copy", style: Toast.Style.Failure });
  }
  return copyContent;
};

export const copyBrowserTabUrl = async (frontmostApp: Application) => {
  // get browser web page url
  let url = await tryCopyBrowserUrl(frontmostApp);
  let shouldCopy = true; // if it has copied in copy***Path, then do not copy again
  let copyContent: string;
  console.log(url);
  console.log(frontmostApp);
  if (isEmpty(url)) {
    if (firefoxBrowsers.includes(frontmostApp.name.toLowerCase())) {
      url = await copyFirefoxBrowserPath(frontmostApp.name);
    } else if (frontmostApp.bundleId?.startsWith("com.apple.Safari.WebApp")) {
      url = await copySafariWebAppPath(frontmostApp.name);
    }
    shouldCopy = false;
  }

  if (isEmpty(url)) {
    return url;
  } else {
    try {
      // handle url
      copyContent = parseURL(url);
      if (showTabTitle) {
        const windowTitle = await getFocusWindowTitle(frontmostApp);
        copyContent = `${windowTitle}\n${copyContent}`;
      }
      if (shouldCopy) {
        await Clipboard.copy(copyContent);
      }
      await showSuccessHUD("🔗 " + copyContent);
      await customUpdateCommandMetadata(new URL(url).hostname);
      return url;
    } catch (e) {
      return url;
    }
  }
};

// spotify:episode:ID -> https://open.spotify.com/episode/ID
const spotifyUriToUrl = (uri: string) => {
  const parts = uri.split(":");
  if (parts.length < 3 || parts[0] !== "spotify") {
    return "";
  }
  const id = parts[parts.length - 1];
  const kind = parts[parts.length - 2];
  return `https://open.spotify.com/${kind}/${id}`;
};

// Spotify's AppleScript dictionary has no album id, but the public track page
// carries <meta name="music:album" content="https://open.spotify.com/album/ID"/>.
const SPOTIFY_FETCH_TIMEOUT_MS = 5000;
const fetchSpotifyAlbumUrl = async (trackUrl: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SPOTIFY_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(trackUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15" },
    });
    if (!res.ok) {
      return "";
    }
    const html = await res.text();
    const match = html.match(/music:album"\s+content="(https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]+)"/);
    return match ? match[1] : "";
  } catch (e) {
    return "";
  } finally {
    clearTimeout(timer);
  }
};

export const copySpotifyUrl = async () => {
  const track = await getSpotifyCurrentTrack();
  const itemUrl = track ? spotifyUriToUrl(track.uri) : "";
  if (!track || isEmpty(itemUrl)) {
    await showFailureHUD({ title: "Nothing Playing in Spotify", style: Toast.Style.Failure });
    return "";
  }
  const isEpisode = track.uri.includes(":episode:");
  let url = itemUrl;
  let icon = "🎧 ";
  // episodes report the show name in "album"; tracks report the artist
  let label = [track.album, track.name].filter((s) => !isEmpty(s)).join(" – ");
  if (isEpisode) {
    // podcasts: always the episode link; "album" holds the show name
  } else if (spotifyLinkTarget !== "album") {
    icon = "🎵 ";
    label = [track.artist, track.name].filter((s) => !isEmpty(s)).join(" – ");
  } else {
    const albumUrl = await fetchSpotifyAlbumUrl(itemUrl);
    if (isEmpty(albumUrl)) {
      // offline or page layout changed: fall back to the track link, and say so
      icon = "🎵 (album lookup failed) ";
      label = [track.artist, track.name].filter((s) => !isEmpty(s)).join(" – ");
    } else {
      url = albumUrl;
      icon = "💿 ";
      label = [track.artist, track.album].filter((s) => !isEmpty(s)).join(" – ");
    }
  }
  let copyContent = parseURL(url);
  if (showTabTitle && !isEmpty(label)) {
    copyContent = `${label}\n${copyContent}`;
  }
  await Clipboard.copy(copyContent);
  await showSuccessHUD(icon + (isEmpty(label) ? copyContent : label));
  await customUpdateCommandMetadata(isEmpty(label) ? url : label);
  return url;
};

const parseURL = (url: string) => {
  try {
    const parsedUrl = parseUrl(url);
    switch (copyUrlContent) {
      case "Protocol://host/pathname": {
        return parsedUrl.protocol + "://" + parsedUrl.resource + parsedUrl.pathname;
      }
      case "Protocol://host": {
        return parsedUrl.protocol + "://" + parsedUrl.resource;
      }
      case "Host": {
        return parsedUrl.resource;
      }
    }
  } catch (e) {
    captureException(e);
    console.error(e);
  }
  return url;
};

export const customUpdateCommandMetadata = async (content: string) => {
  if (showLastCopy) {
    await updateCommandMetadata({ subtitle: content });
  } else {
    await updateCommandMetadata({ subtitle: "Copy Path" });
  }
};

export const showLoadingHUD = async (title: string) => {
  if (showCopyTip) {
    await showToast({ title: title, style: Toast.Style.Animated });
  }
};

export const showSuccessHUD = async (
  title: string,
  options?: { clearRootSearch?: boolean | undefined; popToRootType?: PopToRootType | undefined } | undefined,
) => {
  if (showCopyTip) {
    await showHUD(title, options);
  }
};

export const showFailureHUD = async (options: Toast.Options) => {
  if (showCopyTip) {
    await showToast(options);
  }
};
