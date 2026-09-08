const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const stats = { calls: {}, active: 0, peakActive: 0, peakHeap: 0, cacheBytes: 0, writes: [] };
const sample = () => {
  stats.peakHeap = Math.max(stats.peakHeap, process.memoryUsage().heapUsed);
};
const cache = new Map();
const listeners = new Set();
const local = new Map();
class Cache {
  constructor({ namespace = "" } = {}) {
    this.namespace = namespace;
  }
  get(key) {
    return cache.get(`${this.namespace}:${key}`);
  }
  set(key, value) {
    stats.cacheBytes += Buffer.byteLength(value);
    cache.set(`${this.namespace}:${key}`, value);
    sample();
    for (const fn of listeners) fn();
  }
  remove(key) {
    cache.delete(`${this.namespace}:${key}`);
    for (const fn of listeners) fn();
  }
  subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
}
const component = (name) =>
  function Host(props) {
    return React.createElement(name, props, props.children, props.actions, props.searchBarAccessory);
  };
const Action = component("Action");
Action.Push = component("Action.Push"); // targets mount only after explicit navigation
for (const name of ["OpenInBrowser", "CopyToClipboard", "CreateQuicklink"]) Action[name] = component(`Action.${name}`);
const ActionPanel = component("ActionPanel");
for (const name of ["Submenu", "Section"]) ActionPanel[name] = component(`ActionPanel.${name}`);
const List = component("List");
const Grid = component("Grid");
Grid.Inset = { Small: "small" };
for (const type of [List, Grid]) {
  for (const name of ["Item", "Section", "EmptyView", "Dropdown"])
    type[name] = component(`${type === List ? "List" : "Grid"}.${name}`);
  type.Dropdown.Item = component("Dropdown.Item");
}
const preferences = { "Default-View": "all", cacheRefreshTime: "30", duplicateSongCheck: true };
const toasts = [];
const api = {
  Action,
  ActionPanel,
  List,
  Grid,
  Cache,
  Icon: new Proxy({}, { get: (_, k) => k }),
  Image: { Mask: {} },
  Color: {},
  Keyboard: { Shortcut: { Common: { Refresh: {} } } },
  LaunchType: { UserInitiated: "user" },
  Toast: { Style: { Success: "success", Failure: "failure", Animated: "animated" } },
  environment: {
    commandName: "yourLibrary",
    extensionName: "spotify-player",
    assetsPath: root,
    supportPath: root,
    isDevelopment: true,
  },
  getPreferenceValues: () => preferences,
  showToast: async (toast) => {
    toasts.push(toast);
    return toast;
  },
  showHUD: async () => {},
  popToRoot: async () => {},
  launchCommand: async () => {},
  LocalStorage: {
    getItem: async (k) => local.get(k),
    setItem: async (k, v) => {
      stats.cacheBytes += Buffer.byteLength(v);
      local.set(k, v);
      sample();
    },
    removeItem: async (k) => local.delete(k),
  },
};
let client;
const originalLoad = Module._load;
Module._load = function (name, parent, main) {
  if (name === "@raycast/api") return api;
  if (name.includes("withSpotifyClient"))
    return {
      getSpotifyClient: () => ({ spotifyClient: client }),
      setSpotifyClient: async () => {},
      withSpotifyClient: (fn) => fn,
    };
  if (name.includes("isSpotifyInstalled")) return { checkSpotifyApp: () => {} };
  if (name.endsWith("/StartRadioAction")) return { StartRadioAction: () => null };
  if (name.endsWith("/FooterAction")) return { FooterAction: () => null };
  return originalLoad(name, parent, main);
};
for (const ext of [".ts", ".tsx"])
  require.extensions[ext] = (mod, filename) => {
    const relative = path.relative(root, filename);
    const source =
      process.env.BASELINE_REF && relative.startsWith("src/")
        ? execFileSync("git", ["show", `${process.env.BASELINE_REF}:${process.env.BASELINE_PREFIX ?? ""}${relative}`], {
            cwd: root,
            encoding: "utf8",
          })
        : fs.readFileSync(filename, "utf8");
    mod._compile(
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2023,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
  };
function track(id) {
  return {
    id: `${id}`,
    uri: `spotify:track:${id}`,
    name: `Song ${id}`,
    type: "track",
    duration_ms: 234000,
    artists: [
      { id: "artist", name: "Fixture artist", external_urls: { spotify: "https://open.spotify.com/artist/fixture" } },
    ],
    album: {
      id: "album",
      name: "Fixture Album",
      type: "album",
      images: [640, 300, 64].map((size) => ({
        width: size,
        height: size,
        url: `https://i.scdn.co/image/${id}-${size}`,
      })),
      available_markets: [
        "US",
        "GB",
        "DE",
        "FR",
        "CA",
        "AU",
        "IN",
        "JP",
        "BR",
        "MX",
        "IT",
        "ES",
        "SE",
        "NO",
        "FI",
        "DK",
        "NL",
        "BE",
        "CH",
        "AT",
      ],
    },
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
    available_markets: Array.from({ length: 60 }, (_, i) => `M${i}`),
  };
}
function fixture({ playlists = 250, tracks = 1500, delay = 0, contains = () => false, fail = () => false } = {}) {
  const request = async (name, payload, fn) => {
    stats.calls[name] = (stats.calls[name] ?? 0) + 1;
    stats.active++;
    stats.peakActive = Math.max(stats.peakActive, stats.active);
    try {
      await new Promise((r) => (delay ? setTimeout(r, delay) : setImmediate(r)));
      const result = fn();
      sample();
      return result;
    } finally {
      stats.active--;
    }
  };
  const page = (offset = 0, limit = 50) => ({
    items: Array.from({ length: Math.min(limit, playlists - offset) }, (_, i) => ({
      id: `p${offset + i}`,
      name: `Playlist ${offset + i}`,
      owner: { id: "me", display_name: "Me" },
      tracks: { total: tracks },
      images: [],
      uri: `spotify:playlist:p${offset + i}`,
    })),
    total: playlists,
    next: offset + limit < playlists ? `https://api.spotify.com/v1/me/playlists?offset=${offset + limit}` : null,
  });
  client = {
    getMe: () => request("me", {}, () => ({ id: "me" })),
    getMePlaylists: () => request("catalog", {}, () => page()),
    getNext: (url) => request("catalog", {}, () => page(Number(new URL(url).searchParams.get("offset")))),
    getPlaylistsByPlaylistIdTracks: (id, { offset = 0, limit = 50, fields } = {}) =>
      request("tracks", { id, offset }, () => {
        if (fail(id, offset)) throw new Error("Fixture request failure");
        return {
          items: Array.from({ length: Math.min(limit, tracks - offset) }, (_, i) => {
            const n = offset + i;
            const uri = contains(id, n) ? "spotify:track:target" : `spotify:track:${id}-${n}`;
            return { track: fields ? { uri } : { ...track(`${id}-${n}`), uri } };
          }),
          next:
            offset + limit < tracks
              ? `https://api.spotify.com/v1/playlists/${id}/tracks?offset=${offset + limit}`
              : null,
        };
      }),
    getMeTracks: () =>
      request("savedTracks", {}, () => ({
        items: Array.from({ length: 50 }, (_, i) => ({ track: track(i) })),
        total: 10000,
      })),
    getMeAlbums: () => request("albums", {}, () => ({ items: [] })),
    getMeFollowing: () => request("artists", {}, () => ({ artists: { items: [] } })),
    getMeShows: () => request("shows", {}, () => ({ items: [] })),
    getMeEpisodes: () => request("episodes", {}, () => ({ items: [] })),
    getAlbumsByIdTracks: () =>
      request("albumTracks", {}, () => ({ items: Array.from({ length: 20 }, (_, i) => track(i)) })),
    search: () => request("search", {}, () => ({ tracks: { items: Array.from({ length: 50 }, (_, i) => track(i)) } })),
    getMeTracksContains: () => request("likedContains", {}, () => [false]),
    putMeTracks: (body) =>
      request("like", {}, () => {
        stats.writes.push(["like", body]);
      }),
    postPlaylistsByPlaylistIdTracks: (id, body) =>
      request("add", {}, () => {
        stats.writes.push(["add", id, body]);
        return { snapshot_id: "new" };
      }),
    deletePlaylistsByPlaylistIdTracks: (id, body) =>
      request("remove", {}, () => {
        stats.writes.push(["remove", id, body]);
        return { snapshot_id: "new" };
      }),
    getMePlayerCurrentlyPlaying: () =>
      request("playing", {}, () => ({ item: track("target"), currently_playing_type: "track" })),
  };
  return client;
}
function resetStats() {
  stats.calls = {};
  stats.peakActive = 0;
  stats.peakHeap = 0;
  stats.cacheBytes = 0;
  stats.writes = [];
  cache.clear();
  local.clear();
}
global.IS_REACT_ACT_ENVIRONMENT = true;
module.exports = { React, api, stats, sample, fixture, track, resetStats, preferences, toasts };
