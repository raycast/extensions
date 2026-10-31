// Injected page scripts for the library sections, plus the parsing of what they
// hand back. Nothing here imports runtime modules, so the extraction can be
// exercised against a real response in a plain node process.

import { isVideoId, type BrowseKind, type BrowseResult, type SongResult } from "./search";

// How long a page-side library snapshot is reused before it is fetched again.
const LIBRARY_TTL_MS = 30 * 60 * 1000;
const ROW_LIMIT = 50;
const TRACK_LIMIT = 200;

export const LIBRARY_BROWSE_IDS = {
  albums: "FEmusic_liked_albums",
  artists: "FEmusic_library_corpus_artists",
  playlists: "FEmusic_liked_playlists",
  // Liked songs is the "Liked music" playlist; the library's own song list.
  liked: "FEmusic_liked_videos",
  // There is no FEmusic_recently_played (it answers 400); history is the one that
  // returns the date-grouped shelves.
  recent: "FEmusic_history",
} as const;

export type LibraryScope = keyof typeof LIBRARY_BROWSE_IDS;

/** Scopes whose rows are tracks rather than pages. */
export const TRACK_SCOPES: LibraryScope[] = ["liked", "recent"];

/**
 * Kicks off the three library fetches inside the music tab and returns without
 * waiting for them. The results land on `window.__ytmLibraryV1`, which
 * `LIBRARY_STATE_SCRIPT` polls.
 *
 * The request has to run in the page: an anonymous call to these browse ids
 * answers 400, so only the tab's own session can read them. Each page is trimmed
 * to the handful of fields Raycast needs before it comes back through
 * AppleScript, which keeps the payload in the low kilobytes.
 */
export const LIBRARY_START_SCRIPT = `(function() {
  var ttl = ${LIBRARY_TTL_MS};
  var limit = ${ROW_LIMIT};
  var trackLimit = ${TRACK_LIMIT};
  var scopes = {
    albums: "${LIBRARY_BROWSE_IDS.albums}",
    artists: "${LIBRARY_BROWSE_IDS.artists}",
    playlists: "${LIBRARY_BROWSE_IDS.playlists}",
    liked: "${LIBRARY_BROWSE_IDS.liked}",
    recent: "${LIBRARY_BROWSE_IDS.recent}"
  };
  var trackScopes = { liked: true, recent: true };

  var previous = window.__ytmLibraryV1;
  if (previous && previous.state === "loading") return "loading";
  if (previous && previous.state === "ready" && Date.now() - previous.at < ttl) return "cached";

  // Some builds (including recent Chromium forks) do not expose ytcfg or yt at
  // all, so nothing below may depend on them.
  function cfgValue(key) {
    var cfg = window.ytcfg;
    if (!cfg) return null;
    try {
      if (typeof cfg.get === "function") {
        var fromGet = cfg.get(key);
        if (fromGet) return fromGet;
      }
    } catch (error) { /* fall through to the other sources */ }
    if (cfg.data_ && cfg.data_[key]) return cfg.data_[key];
    if (cfg[key]) return cfg[key];
    var ytConfig = window.yt && window.yt.config_;
    if (ytConfig && ytConfig[key]) return ytConfig[key];
    return null;
  }

  var version = cfgValue("INNERTUBE_CLIENT_VERSION");
  var context = cfgValue("INNERTUBE_CONTEXT") || {
    client: {
      clientName: "WEB_REMIX",
      clientVersion: typeof version === "string" ? version : "1.20231204.01.00",
      hl: document.documentElement.lang || "en",
      gl: "US"
    }
  };

  // Public WEB_REMIX key, used when the page config is not readable.
  var apiKey = cfgValue("INNERTUBE_API_KEY") || "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";

  // Split rather than regex: this code lives inside a template literal, where a
  // backslash in a string pattern collapses and silently breaks the match.
  function cookieValue(name) {
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.indexOf(name + "=") === 0) return part.slice(name.length + 1);
    }
    return null;
  }

  function hex(buffer) {
    return Array.prototype.map
      .call(new Uint8Array(buffer), function (byte) { return ("0" + byte.toString(16)).slice(-2); })
      .join("");
  }

  // Which Google account the tab is signed into. Only some builds expose it; the
  // default matches a single-account session.
  function authUser() {
    var index = cfgValue("SESSION_INDEX");
    return typeof index === "string" && /^[0-9]+$/.test(index) ? index : "0";
  }

  // Cookies alone do not authenticate an innertube call: it answers 200 with a
  // sign-in prompt and logged_in=0. The session is proven with a SAPISIDHASH
  // header, which is the same thing the app's own requests carry.
  function authorization(callback) {
    var secret = cookieValue("SAPISID") || cookieValue("__Secure-3PAPISID") || cookieValue("APISID");
    if (!secret || !window.crypto || !crypto.subtle) { callback(null); return; }

    var seconds = Math.floor(Date.now() / 1000);
    var origin = "https://music.youtube.com";
    crypto.subtle.digest("SHA-1", new TextEncoder().encode(seconds + " " + secret + " " + origin))
      .then(function (digest) { callback("SAPISIDHASH " + seconds + "_" + hex(digest)); })
      .catch(function () { callback(null); });
  }

  function collect(node, key, out) {
    if (!node || typeof node !== "object") return out;
    if (Object.prototype.toString.call(node) === "[object Array]") {
      for (var i = 0; i < node.length; i++) collect(node[i], key, out);
      return out;
    }
    if (node[key]) out.push(node[key]);
    for (var name in node) collect(node[name], key, out);
    return out;
  }

  function joinedText(text) {
    if (!text || !text.runs) return "";
    var parts = [];
    for (var i = 0; i < text.runs.length; i++) parts.push(text.runs[i].text || "");
    return parts.join("").trim();
  }

  function pageTypeOf(endpoint) {
    var browse = endpoint && endpoint.browseEndpoint;
    var configs = browse && browse.browseEndpointContextSupportedConfigs;
    var music = configs && configs.browseEndpointContextMusicConfig;
    return music && music.pageType ? music.pageType : "";
  }

  function kindOf(pageType) {
    if (pageType === "MUSIC_PAGE_TYPE_ALBUM") return "album";
    if (pageType === "MUSIC_PAGE_TYPE_ARTIST") return "artist";
    if (pageType === "MUSIC_PAGE_TYPE_PLAYLIST") return "playlist";
    return "";
  }

  // Library pages are not one shape: saved albums and playlists arrive as grid
  // tiles, followed artists as a shelf of list rows. Both carry the same
  // navigation, so one extractor covers them and only the text and thumbnail
  // containers differ.
  function parseNode(node, isTile) {
    var browse = node.navigationEndpoint && node.navigationEndpoint.browseEndpoint;
    var id = browse && browse.browseId;
    if (!id) return null;
    var kind = kindOf(pageTypeOf(node.navigationEndpoint));
    if (!kind) return null;

    var title = rowTitle(node);
    if (!title) return null;

    var subtitleNode = null;
    var thumbnail = null;
    var overlay = null;

    if (isTile) {
      subtitleNode = node.subtitle;
      thumbnail = node.thumbnailRenderer;
      overlay = node.thumbnailOverlay;
    } else {
      var columns = node.flexColumns || [];
      var column = columns[1] && columns[1].musicResponsiveListItemFlexColumnRenderer;
      subtitleNode = column ? column.text : null;
      thumbnail = node.thumbnail;
      overlay = node.overlay;
    }

    var runs = subtitleNode && subtitleNode.runs ? subtitleNode.runs : [];
    var parts = [];
    var linked = "";
    for (var r = 0; r < runs.length; r++) {
      var text = (runs[r].text || "").trim();
      if (!text || text === "\\u2022") continue;
      parts.push(text);
      var runBrowse = runs[r].navigationEndpoint && runs[r].navigationEndpoint.browseEndpoint;
      if (runBrowse && !linked) linked = text;
    }
    // The linked run is the artist or the owner. Without one, the first run is a
    // type label ("Album", "Artist", "Mix") and the second is the value; a single
    // run with no label is the value itself.
    var subtitle = "";
    var detail = "";
    if (linked) {
      subtitle = linked;
      detail = parts.filter(function(part) { return part !== linked; })[0] || "";
    } else if (parts.length > 1) {
      subtitle = parts[1];
      detail = parts[0];
    } else {
      subtitle = parts[0] || "";
    }

    var itemOverlay = overlay && overlay.musicItemThumbnailOverlayRenderer;
    var button = itemOverlay && itemOverlay.content && itemOverlay.content.musicPlayButtonRenderer;
    var play = button && button.playNavigationEndpoint;
    var playlistId = play && play.watchPlaylistEndpoint ? play.watchPlaylistEndpoint.playlistId || "" : "";
    if (!playlistId && kind === "playlist" && id.indexOf("VL") === 0) playlistId = id.slice(2);

    var renderer = thumbnail && thumbnail.musicThumbnailRenderer;
    var thumbs = renderer && renderer.thumbnail && renderer.thumbnail.thumbnails ? renderer.thumbnail.thumbnails : [];
    var art = thumbs.length ? thumbs[thumbs.length - 1].url || "" : "";

    return { k: kind, t: title, s: subtitle, d: detail, i: id, p: playlistId, a: art };
  }

  // Song rows carry the video id on playlistItemData rather than a browse
  // endpoint: title, then artist, then album as flex columns, duration fixed.
  function trackOf(node) {
    var data = node.playlistItemData;
    var id = data && data.videoId;
    if (!id) return null;

    var title = rowTitle(node);
    if (!title) return null;

    function columnText(index) {
      var columns = node.flexColumns || [];
      var column = columns[index] && columns[index].musicResponsiveListItemFlexColumnRenderer;
      return column && column.text ? joinedText(column.text) : "";
    }

    var fixed = node.fixedColumns && node.fixedColumns[0] && node.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer;
    var renderer = node.thumbnail && node.thumbnail.musicThumbnailRenderer;
    var thumbs = renderer && renderer.thumbnail && renderer.thumbnail.thumbnails ? renderer.thumbnail.thumbnails : [];

    return {
      v: id,
      t: title,
      a: columnText(1),
      b: columnText(2),
      d: fixed && fixed.text ? joinedText(fixed.text) : "",
      art: thumbs.length ? thumbs[thumbs.length - 1].url || "" : ""
    };
  }

  function trackRows(response) {
    var nodes = collect(response, "musicResponsiveListItemRenderer", []);
    var rows = [];
    for (var i = 0; i < nodes.length && rows.length < trackLimit; i++) {
      var row = trackOf(nodes[i]);
      if (row) rows.push(row);
    }
    return rows;
  }

  function rowsOf(response) {
    var tiles = collect(response, "musicTwoRowItemRenderer", []);
    var listRows = collect(response, "musicResponsiveListItemRenderer", []);
    var nodes = [];

    for (var i = 0; i < tiles.length; i++) nodes.push({ node: tiles[i], tile: true });
    for (var j = 0; j < listRows.length; j++) nodes.push({ node: listRows[j], tile: false });

    var rows = [];
    for (var k = 0; k < nodes.length && rows.length < limit; k++) {
      var parsed = parseNode(nodes[k].node, nodes[k].tile);
      if (parsed) rows.push(parsed);
    }
    return rows;
  }

  // The response tells us whether the request was authenticated; a sign-in
  // prompt in the payload does not, because the page can carry one for other
  // features while the session is perfectly valid.
  function loggedInFlag(response) {
    var tracking = response && response.responseContext && response.responseContext.serviceTrackingParams;
    if (!tracking) return null;
    for (var i = 0; i < tracking.length; i++) {
      var params = tracking[i] && tracking[i].params;
      if (!params) continue;
      for (var j = 0; j < params.length; j++) {
        if (params[j] && params[j].key === "logged_in") return params[j].value === "1";
      }
    }
    return null;
  }

  function rowTitle(node) {
    if (node.title) return joinedText(node.title);
    var columns = node.flexColumns;
    if (columns && columns[0] && columns[0].musicResponsiveListItemFlexColumnRenderer) {
      return joinedText(columns[0].musicResponsiveListItemFlexColumnRenderer.text);
    }
    return "";
  }

  function sectionKeys(response) {
    var tabs = response && response.contents && response.contents.singleColumnBrowseResultsRenderer;
    var list = tabs && tabs.tabs && tabs.tabs[0] && tabs.tabs[0].tabRenderer && tabs.tabs[0].tabRenderer.content;
    var contents = list && list.sectionListRenderer && list.sectionListRenderer.contents;
    if (!contents) return [];
    var keys = [];
    for (var i = 0; i < contents.length; i++) keys.push(Object.keys(contents[i])[0] || "");
    return keys;
  }

  // Everything needed to tell a wrong browse id from an unauthenticated request
  // from an unfamiliar row shape, without a second round of guessing.
  function diagOf(scope, status, response) {
    var titles = [];
    var nodes = collect(response, "musicTwoRowItemRenderer", []).concat(
      collect(response, "musicResponsiveListItemRenderer", [])
    );
    for (var i = 0; i < nodes.length && titles.length < 3; i++) {
      var title = rowTitle(nodes[i]);
      if (title) titles.push(title);
    }

    return {
      id: scopes[scope],
      status: status,
      loggedIn: loggedInFlag(response),
      signInPrompt: JSON.stringify(response).indexOf("signInEndpoint") >= 0,
      tiles: collect(response, "musicTwoRowItemRenderer", []).length,
      rows: collect(response, "musicResponsiveListItemRenderer", []).length,
      shelves: collect(response, "musicShelfRenderer", []).length,
      grids: collect(response, "gridRenderer", []).length,
      sections: sectionKeys(response),
      titles: titles
    };
  }

  window.__ytmLibraryV1 = { state: "loading", at: 0, data: null, error: null, diag: {} };
  var data = {};
  var diag = {};
  var truncated = {};
  var remaining = 0;
  var settled = false;
  var loggedOut = false;
  var total = 0;

  function fail(message) {
    if (settled) return;
    settled = true;
    window.__ytmLibraryV1 = { state: "error", at: 0, data: null, error: message, diag: diag };
  }

  function start(headers) {
    Object.keys(scopes).forEach(function(scope) {
      remaining++;
      fetch("/youtubei/v1/browse?key=" + encodeURIComponent(apiKey) + "&prettyPrint=false", {
        method: "POST",
        credentials: "include",
        headers: headers,
        body: JSON.stringify({ context: context, browseId: scopes[scope] })
      }).then(function(response) {
        if (response.ok) return response.json().then(function(json) { return { status: response.status, json: json }; });
        return response.text().then(function(body) {
          throw new Error(scope + " " + response.status + " " + body.slice(0, 140));
        });
      }).then(function(result) {
        if (settled) return;
        var json = result.json;
        diag[scope] = diagOf(scope, result.status, json);
        if (diag[scope].loggedIn === false) loggedOut = true;

        var rows = trackScopes[scope] ? trackRows(json) : rowsOf(json);
        data[scope] = rows;
        // A scope that fills the cap may be hiding rows the server did send.
        if (rows.length >= (trackScopes[scope] ? trackLimit : limit)) truncated[scope] = true;
        total += rows.length;
        remaining--;
        if (remaining === 0) {
          settled = true;
          data.__truncated = truncated;
          window.__ytmLibraryV1 = {
            state: total === 0 && loggedOut ? "signed-out" : "ready",
            at: Date.now(),
            data: data,
            error: null,
            diag: diag
          };
        }
      }).catch(function(error) {
        fail(String((error && error.message) || error));
      });
    });
  }

  authorization(function (header) {
    start(header ? { "Content-Type": "application/json", "Authorization": header, "X-Goog-AuthUser": authUser() } : { "Content-Type": "application/json" });
  });

  return "started";
})();`;

/** Drops the page snapshot so the next start fetches again. */
export const LIBRARY_RESET_SCRIPT = `(function() {
  window.__ytmLibraryV1 = null;
  return "ok";
})();`;

/**
 * A compact account of what the last run received: per-scope status, the
 * response's own logged_in flag, which renderers came back, and a few titles.
 * Copied to the clipboard so a wrong browse id can be told apart from a
 * signed-out session or an unfamiliar row shape.
 */
export const LIBRARY_DIAGNOSTICS_SCRIPT = `(function() {
  var library = window.__ytmLibraryV1;
  var cfg = window.ytcfg;
  var info = {
    state: library ? library.state : "none",
    error: library ? library.error : null,
    page: {
      href: location.href,
      cookieBytes: document.cookie.length,
      hasLoginCookie: (function () {
        var parts = document.cookie.split(";");
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i].trim();
          if (part.indexOf("SID=") === 0 || part.indexOf("SAPISID=") === 0 || part.indexOf("__Secure-3PSID=") === 0) return true;
        }
        return false;
      })()
    },
    config: {
      hasYtcfg: !!cfg,
      hasGet: !!(cfg && typeof cfg.get === "function"),
      dataKeys: cfg && cfg.data_ ? Object.keys(cfg.data_).filter(function(key) { return key.indexOf("INNERTUBE") === 0; }) : [],
      hasContext: !!cfgValueProbe("INNERTUBE_CONTEXT"),
      hasKey: !!cfgValueProbe("INNERTUBE_API_KEY"),
      hasSapisid: (function () {
        var parts = document.cookie.split(";");
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i].trim();
          if (part.indexOf("SAPISID=") === 0 || part.indexOf("__Secure-3PAPISID=") === 0) return true;
        }
        return false;
      })()
    },
    scopes: library && library.diag ? library.diag : {}
  };

  function cfgValueProbe(key) {
    if (!cfg) return null;
    try { if (typeof cfg.get === "function") { var value = cfg.get(key); if (value) return value; } } catch (error) {}
    if (cfg.data_ && cfg.data_[key]) return cfg.data_[key];
    if (cfg[key]) return cfg[key];
    if (window.yt && window.yt.config_ && window.yt.config_[key]) return window.yt.config_[key];
    return null;
  }

  return JSON.stringify(info);
})();`;

/** Reads the state the start script left behind; a JSON payload once ready. */
export const LIBRARY_STATE_SCRIPT = `(function() {
  var library = window.__ytmLibraryV1;
  if (!library) return "idle";
  if (library.state === "loading") return "pending";
  if (library.state === "signed-out") return "signed-out";
  if (library.state === "error") return "error:" + library.error;
  return JSON.stringify(library.data);
})();`;

// Track lists for one album or playlist. A playlist page is addressed by its VL
// browse id and hangs its rows off musicPlaylistShelfRenderer; an album page by
// its MPREb id, with the rows in a shelf. Both expose the same row structure as
// the liked songs list, so the extraction mirrors it.
const COLLECTION_LIMIT = 500;

export function collectionStartScript(browseId: string, albumTitle: string, fallbackArt: string): string {
  return `(function() {
  var limit = ${COLLECTION_LIMIT};
  var browseId = ${JSON.stringify(browseId)};
  var albumTitle = ${JSON.stringify(albumTitle)};
  var fallbackArt = ${JSON.stringify(fallbackArt)};
  var apiKey = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
  var context = { client: { clientName: "WEB_REMIX", clientVersion: "1.20231204.01.00", hl: document.documentElement.lang || "en", gl: "US" } };

  function cookieValue(name) {
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.indexOf(name + "=") === 0) return part.slice(name.length + 1);
    }
    return null;
  }

  function hex(buffer) {
    return Array.prototype.map
      .call(new Uint8Array(buffer), function (byte) { return ("0" + byte.toString(16)).slice(-2); })
      .join("");
  }

  function authorization(callback) {
    var secret = cookieValue("SAPISID") || cookieValue("__Secure-3PAPISID") || cookieValue("APISID");
    if (!secret || !window.crypto || !crypto.subtle) { callback(null); return; }
    var seconds = Math.floor(Date.now() / 1000);
    crypto.subtle.digest("SHA-1", new TextEncoder().encode(seconds + " " + secret + " https://music.youtube.com"))
      .then(function (digest) { callback("SAPISIDHASH " + seconds + "_" + hex(digest)); })
      .catch(function () { callback(null); });
  }

  function collect(node, key, out) {
    if (!node || typeof node !== "object") return out;
    if (Object.prototype.toString.call(node) === "[object Array]") {
      for (var i = 0; i < node.length; i++) collect(node[i], key, out);
      return out;
    }
    if (node[key]) out.push(node[key]);
    for (var name in node) collect(node[name], key, out);
    return out;
  }

  function joinedText(text) {
    if (!text || !text.runs) return "";
    var parts = [];
    for (var i = 0; i < text.runs.length; i++) parts.push(text.runs[i].text || "");
    return parts.join("").trim();
  }

  function columnText(node, index) {
    var columns = node.flexColumns || [];
    var column = columns[index] && columns[index].musicResponsiveListItemFlexColumnRenderer;
    return column && column.text ? joinedText(column.text) : "";
  }

  function trackOf(node) {
    var data = node.playlistItemData;
    var id = data && data.videoId;
    if (!id) return null;
    var title = columnText(node, 0);
    if (!title) return null;
    var fixed = node.fixedColumns && node.fixedColumns[0] && node.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer;
    var renderer = node.thumbnail && node.thumbnail.musicThumbnailRenderer;
    var thumbs = renderer && renderer.thumbnail && renderer.thumbnail.thumbnails ? renderer.thumbnail.thumbnails : [];
    return {
      v: id,
      t: title,
      a: columnText(node, 1),
      b: columnText(node, 2),
      d: fixed && fixed.text ? joinedText(fixed.text) : "",
      art: thumbs.length ? thumbs[thumbs.length - 1].url || "" : ""
    };
  }

  window.__ytmCollectionV1 = window.__ytmCollectionV1 || {};
  window.__ytmCollectionV1[browseId] = { state: "loading" };

  // Some builds expose the account index, most do not; default to the first.
  function authUser() {
    var cfg = window.ytcfg;
    var index = null;
    try { if (cfg && typeof cfg.get === "function") index = cfg.get("SESSION_INDEX"); } catch (error) { /* fall through */ }
    if (!index && cfg && cfg.data_) index = cfg.data_.SESSION_INDEX;
    return typeof index === "string" && /^[0-9]+$/.test(index) ? index : "0";
  }

  var hitCap = false;

  function addTracks(json, rows) {
    var nodes = collect(json, "musicResponsiveListItemRenderer", []);
    for (var i = 0; i < nodes.length && rows.length < limit; i++) {
      var row = trackOf(nodes[i]);
      if (!row) continue;
      // An album page's third column is a play count, so the album name comes
      // from the page we opened instead, and its rows carry no thumbnail of
      // their own, so the cover stands in for them.
      if (albumTitle) row.b = albumTitle;
      if (!row.art && fallbackArt) row.art = fallbackArt;
      rows.push(row);
    }
    return rows;
  }

  function nextToken(json) {
    var commands = collect(json, "continuationCommand", []);
    return commands.length && commands[0].token ? commands[0].token : "";
  }

  authorization(function (header) {
    var headers = { "Content-Type": "application/json" };
    if (header) { headers["Authorization"] = header; headers["X-Goog-AuthUser"] = authUser(); }

    // Playlists only page when the server sends a continuation token; the ones
    // seen in testing arrive complete, so this usually runs once.
    function loadPage(payload, rows) {
      return fetch("/youtubei/v1/browse?key=" + encodeURIComponent(apiKey) + "&prettyPrint=false", {
        method: "POST",
        credentials: "include",
        headers: headers,
        body: JSON.stringify(payload)
      }).then(function (response) {
        if (response.ok) return response.json();
        return response.text().then(function (body) {
          throw new Error(response.status + " " + body.slice(0, 140));
        });
      }).then(function (json) {
        addTracks(json, rows);
        var token = nextToken(json);
        if (token && rows.length < limit) return loadPage({ context: context, continuation: token }, rows);
        hitCap = rows.length >= limit;
        return rows;
      });
    }

    loadPage({ context: context, browseId: browseId }, [])
      .then(function (rows) {
        window.__ytmCollectionV1[browseId] = { state: "ready", rows: rows, truncated: hitCap };
      })
      .catch(function (error) {
        window.__ytmCollectionV1[browseId] = { state: "error", error: String((error && error.message) || error) };
      });
  });

  return "started";
})();`;
}

export function collectionStateScript(browseId: string): string {
  return `(function() {
  var all = window.__ytmCollectionV1 || {};
  var entry = all[${JSON.stringify(browseId)}];
  if (!entry) return "idle";
  if (entry.state === "loading") return "pending";
  if (entry.state === "error") return "error:" + entry.error;
  return JSON.stringify({ rows: entry.rows, truncated: !!entry.truncated });
})();`;
}

export interface LibraryData {
  albums: BrowseResult[];
  artists: BrowseResult[];
  playlists: BrowseResult[];
  liked: SongResult[];
  recent: SongResult[];
  /** Scopes whose cap was reached, so the list may be hiding rows. */
  truncated?: Partial<Record<LibraryScope, boolean>>;
}

interface CompactRow {
  k?: string;
  t?: string;
  s?: string;
  d?: string;
  i?: string;
  p?: string;
  a?: string;
}

function toBrowseResult(row: CompactRow): BrowseResult | null {
  if (row.k !== "album" && row.k !== "artist" && row.k !== "playlist") return null;
  if (!row.i || !row.t) return null;

  const kind: BrowseKind = row.k;
  return {
    source: "browse",
    kind,
    id: row.i,
    title: row.t,
    subtitle: row.s || undefined,
    detail: row.d || undefined,
    playlistId: row.p || undefined,
    artworkURL: row.a || undefined,
  };
}

export function parseCollectionPayload(raw: string): { tracks: SongResult[]; truncated: boolean } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  const container = Array.isArray(parsed) ? undefined : (parsed as Record<string, unknown> | null);
  const rows = Array.isArray(parsed)
    ? parsed
    : container && Array.isArray(container["rows"])
    ? container["rows"]
    : null;
  if (!rows) return null;

  return {
    tracks: (rows as unknown[])
      .map((row) => toSongResult(row as CompactTrack))
      .filter((row): row is SongResult => row !== null),
    truncated: container ? Boolean(container["truncated"]) : false,
  };
}

export function parseLibraryPayload(raw: string): LibraryData | null {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  const read = (scope: string): BrowseResult[] => {
    const rows = payload[scope];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => toBrowseResult(row as CompactRow)).filter((row): row is BrowseResult => row !== null);
  };

  const readTracks = (scope: string): SongResult[] => {
    const rows = payload[scope];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => toSongResult(row as CompactTrack)).filter((row): row is SongResult => row !== null);
  };

  const truncated: Partial<Record<LibraryScope, boolean>> = {};
  const truncatedRaw = payload["__truncated"];
  if (truncatedRaw && typeof truncatedRaw === "object") {
    for (const [scope, hit] of Object.entries(truncatedRaw as Record<string, unknown>)) {
      if (hit) truncated[scope as LibraryScope] = true;
    }
  }

  return {
    albums: read("albums"),
    artists: read("artists"),
    playlists: read("playlists"),
    liked: readTracks("liked"),
    recent: readTracks("recent"),
    truncated,
  };
}

interface CompactTrack {
  v?: string;
  t?: string;
  a?: string;
  b?: string;
  d?: string;
  art?: string;
}

function toSongResult(row: CompactTrack): SongResult | null {
  if (!row.v || !row.t || !isVideoId(row.v)) return null;

  return {
    source: "ytmusic",
    id: row.v,
    title: row.t,
    artist: row.a || "Unknown Artist",
    album: row.b || undefined,
    duration: row.d || undefined,
    artworkURL: row.art || undefined,
  };
}
