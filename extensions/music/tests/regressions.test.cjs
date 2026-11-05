const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

// Load the real TypeScript modules while replacing only the Raycast host APIs.
function loadSource(entry, runAppleScript = async () => "", moduleMocks = {}) {
  const cache = new Map();
  function load(filename) {
    const resolved = [filename, `${filename}.ts`, `${filename}.tsx`, path.join(filename, "index.ts")].find(
      (candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate),
    );
    if (!resolved) throw new Error(`Cannot resolve ${filename}`);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} };
    cache.set(resolved, module);
    const code = ts.transpileModule(readFileSync(resolved, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
      fileName: resolved,
    }).outputText;
    const localRequire = (id) => {
      if (id in moduleMocks) return moduleMocks[id];
      if (id === "@raycast/utils") return { runAppleScript };
      if (id === "@raycast/api") {
        return { environment: { isDevelopment: false }, getPreferenceValues: () => ({}) };
      }
      return id.startsWith(".") ? load(path.resolve(path.dirname(resolved), id)) : require(id);
    };
    new Function("require", "module", "exports", code)(localRequire, module, module.exports);
    return module.exports;
  }
  return load(path.resolve(__dirname, "..", entry));
}

const catalogSong = {
  id: "1679612971",
  title: "Through the Fire and Flames",
  artist: "DragonForce",
  album: "Inhuman Rampage",
  playable: true,
  url: "https://music.apple.com/fr/album/inhuman-rampage/1679612960?i=1679612971",
};

test("catalog playback validates exact Apple host, protocol, album path and song ID", () => {
  const { catalogPlaybackUrl } = loadSource("src/util/scripts/catalog.ts");
  assert.equal(catalogPlaybackUrl(catalogSong), catalogSong.url.replace("https:", "music:"));
  for (const url of [
    "https://music.apple.com.evil.test/fr/album/x/1?i=1679612971",
    "https://music.apple.com@evil.test/fr/album/x/1?i=1679612971",
    "https://user@music.apple.com/fr/album/x/1?i=1679612971",
    "https://music.apple.com:444/fr/album/x/1?i=1679612971",
    "file:///tmp/music",
    "javascript:alert(1)",
    "https://music.apple.com/fr/album/x/1?i=2",
    catalogSong.url + "&i=2",
    "https://music.apple.com/fr/song/x/1679612971",
  ])
    assert.throws(() => catalogPlaybackUrl({ ...catalogSong, url }));
  assert.throws(() => catalogPlaybackUrl({ ...catalogSong, playable: false }));
  assert.throws(() => catalogPlaybackUrl({ ...catalogSong, artist: "" }));
});

test("catalog script fails closed and verifies exact metadata instead of generic playing", () => {
  const { catalogPlaybackScript } = loadSource("src/util/scripts/catalog.ts");
  const script = catalogPlaybackScript(catalogSong);
  assert.match(script, /count of foundRows\) is 1/);
  assert.match(script, /if not frontmost then error/);
  assert.match(script, /name of current track is "Through the Fire and Flames"/);
  assert.match(script, /artist of current track is "DragonForce"/);
  assert.match(script, /album of current track is "Inhuman Rampage"/);
  assert.match(script, /player state is playing/);
  assert.match(script, /repeat 40 times/);
  assert.doesNotMatch(script, /duplicate|addToLibrary|key code 49/);
});

test("catalog metadata is escaped before inserting into AppleScript", () => {
  const { catalogPlaybackScript } = loadSource("src/util/scripts/catalog.ts");
  const script = catalogPlaybackScript({ ...catalogSong, title: 'A "quoted" song' });
  assert.ok(script.includes('A \\"quoted\\" song'));
});

test("catalog playback requires explicit verification and propagates errors", async () => {
  let result = "verified";
  let failure;
  let calls = 0;
  const { playCatalogSong } = loadSource("src/util/scripts/catalog.ts", async (_script, _args, options) => {
    calls++;
    assert.equal(options.timeout, 30000);
    if (failure) throw failure;
    return result;
  });
  assert.equal((await playCatalogSong(catalogSong)())._tag, "Right");
  result = "playing";
  assert.equal((await playCatalogSong(catalogSong)())._tag, "Left");
  failure = new Error("Accessibility denied");
  assert.match((await playCatalogSong(catalogSong)()).left.message, /Accessibility denied/);
  const previousCalls = calls;
  assert.equal((await playCatalogSong({ ...catalogSong, playable: false })())._tag, "Left");
  assert.equal(calls, previousCalls);
});

const row = (id, name, artist = "Artist", album = "Album") =>
  `id=${id}$BREAKname=${name}$BREAKartist=${artist}$BREAKalbum=${album}$BREAKduration=120`;

test("Just Play keeps library playback independent of catalog sign-in and only falls back on a miss", async () => {
  const E = require("fp-ts/Either");
  const TE = require("fp-ts/TaskEither");
  let raw = row("1", "Local Song");
  let searchFailure;
  let authCalls = 0,
    catalogCalls = 0,
    localPlays = 0,
    catalogPlays = 0;
  const messages = [];
  const justPlay = loadSource("src/just-play.tsx", undefined, {
    "@raycast/api": { closeMainWindow: async () => {} },
    "./util/feedback": {
      hud: async (message) => {
        messages.push(message);
      },
    },
    "./util/scripts": {
      track: {
        search: () => async () => (searchFailure ? E.left(searchFailure) : E.right(raw)),
        playById: () => async () => {
          localPlays++;
          return E.right("");
        },
      },
    },
    "./util/apple-music-auth": {
      withAppleMusicAuth:
        (fn) =>
        async (...args) => {
          authCalls++;
          return fn(...args);
        },
    },
    "./util/catalog-api": {
      searchCatalog: () => {
        catalogCalls++;
        return TE.right({ songs: [catalogSong], albums: [] });
      },
    },
    "./util/scripts/catalog": {
      playCatalogSong: () => async () => {
        catalogPlays++;
        return E.right();
      },
    },
  }).default;
  await justPlay({ arguments: { query: "Local Song" } });
  assert.equal(localPlays, 1);
  assert.equal(authCalls, 0);
  raw = "";
  await justPlay({ arguments: { query: "DragonForce" } });
  assert.equal(authCalls, 1);
  assert.equal(catalogPlays, 1);
  assert.match(messages.at(-1), /Through the Fire and Flames/);
  searchFailure = new Error("Music is unavailable");
  await justPlay({ arguments: { query: "Other" } });
  assert.equal(catalogCalls, 1);
  assert.match(messages.at(-1), /Music is unavailable/);
  await justPlay({ arguments: { query: "  " } });
  assert.equal(catalogCalls, 1);
});

test("catalog AI playback resolves metadata and never claims success after script failure", async () => {
  const TE = require("fp-ts/TaskEither");
  let failed = false;
  let seen;
  const play = loadSource("src/tools/play-catalog-song.ts", undefined, {
    "@raycast/api": { closeMainWindow: async () => {} },
    "../util/apple-music-auth": { withAppleMusicAuth: (fn) => fn },
    "../util/catalog-api": {
      getCatalogSong: (id) => {
        assert.equal(id, catalogSong.id);
        return TE.right(catalogSong);
      },
    },
    "../util/scripts/catalog": {
      playCatalogSong: (song) => {
        seen = song;
        return failed ? TE.left(new Error("Wrong track still playing")) : TE.right();
      },
    },
  }).default;
  const result = await play({ songId: catalogSong.id });
  assert.equal(result.playing, true);
  assert.equal(seen, catalogSong);
  failed = true;
  await assert.rejects(play({ songId: catalogSong.id }), /Wrong track/);
});

test("metadata keeps equals signs and empty output produces no phantom tracks", () => {
  const { parseResult } = loadSource("src/util/parser.ts");
  assert.deepEqual(parseResult()(" \n\n"), []);
  const tracks = parseResult()(`${row("1", "A=B=C")}\n\n`);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].name, "A=B=C");
});

test("search ranks title above artist above album and preserves fuzzy matches", () => {
  const { parseTrackSearchResults } = loadSource("src/util/search-tracks.ts");
  const raw = [
    row("album", "Other", "Other", "Hello"),
    row("artist", "Other", "Hello"),
    row("contains", "Say Hello"),
    row("prefix", "Hello World"),
    row("exact", "Héllo"),
    row("fuzzy1", "Hllo"),
    row("fuzzy2", "Hallo"),
  ].join("\n");
  assert.deepEqual(
    parseTrackSearchResults(raw, " HELLO ").map((track) => track.id),
    ["exact", "prefix", "contains", "artist", "album", "fuzzy1", "fuzzy2"],
  );
  assert.deepEqual(
    parseTrackSearchResults(raw, "").map((track) => track.id),
    ["album", "artist", "contains", "prefix", "exact", "fuzzy1", "fuzzy2"],
  );
});

test("the AI library search uses the same ranking and handles an empty library", async () => {
  let raw = `${row("artist", "Other", "Hello")}\n${row("title", "Hello")}`;
  const search = loadSource("src/tools/get-library-tracks.ts", async () => raw).default;
  const result = await search({ search: "Hello" });
  assert.deepEqual(
    result.right.map((track) => track.id),
    ["title", "artist"],
  );
  raw = "";
  assert.deepEqual(await search(), { _tag: "Right", right: [] });
});

test("AppleScript calls have an explicit timeout and normalize rejected values", async () => {
  const calls = [];
  const { runScript } = loadSource("src/util/apple-script.ts", async (...args) => {
    calls.push(args);
    throw "Music is unresponsive";
  });
  const result = await runScript("return 1")();
  assert.equal(calls[0][2].timeout, 10000);
  assert.equal(result._tag, "Left");
  assert.ok(result.left instanceof Error);
  assert.equal(result.left.shortMessage, "Music is unresponsive");
});

test("search and playlist names escape quotes, backslashes, and newlines", async () => {
  const scripts = [];
  const run = async (script) => {
    scripts.push(script);
    return "";
  };
  const tracks = loadSource("src/util/scripts/track.ts", run);
  const playlists = loadSource("src/util/scripts/playlists.ts", run);
  await tracks.search('A "quoted" \\ song\nname')();
  await playlists.play()('A "quoted" \\ playlist')();
  assert.ok(scripts[0].includes('for "A \\"quoted\\" \\\\ song name"'));
  assert.ok(scripts.at(-1).includes('playlist "A \\"quoted\\" \\\\ playlist"'));
});

test("toggle feedback uses the state returned by one bounded script", async () => {
  const scripts = [];
  let response = "true";
  const player = loadSource("src/util/scripts/player-controls.ts", async (script) => {
    scripts.push(script);
    return response;
  });
  assert.deepEqual(await player.shuffle.toggle(), { _tag: "Right", right: true });
  assert.equal(scripts.length, 1);
  assert.match(scripts[0], /repeat 20 times/);
  assert.match(scripts[0], /if shuffle enabled is targetState then return/);
  response = "false";
  assert.deepEqual(await player.repeat.toggle(), { _tag: "Right", right: false });
  response = "all";
  assert.deepEqual(await player.repeat.get(), { _tag: "Right", right: true });
});

test("volume hotkeys read and set volume in one time-limited Music call", async () => {
  const calls = [];
  const player = loadSource("src/util/scripts/player-controls.ts", async (...args) => {
    calls.push(args);
    return "75";
  });

  assert.deepEqual(await player.volume.increase(10)(), { _tag: "Right", right: 75 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].timeout, 5_000);
  assert.match(calls[0][0], /set nextVolume to \(sound volume\) \+ \(10\)/);
  assert.match(calls[0][0], /set sound volume to nextVolume/);

  await player.volume.decrease(5)();
  assert.equal(calls.length, 2);
  assert.match(calls[1][0], /set nextVolume to \(sound volume\) \+ \(-5\)/);
});

test("rewind and fast forward clamp the position inside one time-limited Music call", async () => {
  const calls = [];
  const player = loadSource("src/util/scripts/player-controls.ts", async (...args) => {
    calls.push(args);
    return "42.5";
  });

  assert.deepEqual(await player.position.rewind(15)(), { _tag: "Right", right: 42.5 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].timeout, 5_000);
  assert.match(calls[0][0], /if player state is stopped then error/);
  assert.match(calls[0][0], /set nextPosition to \(player position\) \+ \(-15\)/);
  assert.match(calls[0][0], /if nextPosition < 0 then set nextPosition to 0/);
  assert.match(calls[0][0], /if nextPosition > trackDuration then set nextPosition to trackDuration/);

  await player.position.fastForward(30)();
  assert.equal(calls.length, 2);
  assert.match(calls[1][0], /set nextPosition to \(player position\) \+ \(30\)/);
});

test("playlist insertion is bounded, escaped, and is not retried after a failure", async () => {
  const scripts = [];
  const currentTrack = loadSource("src/util/scripts/current-track.ts", async (script) => {
    scripts.push(script);
    throw new Error("Music rejected the playlist");
  });
  const result = await currentTrack.addToPlaylist('My "Playlist"')();
  assert.equal(result._tag, "Left");
  assert.equal(scripts.length, 1);
  assert.match(scripts[0], /repeat 20 times/);
  assert.doesNotMatch(scripts[0], /repeat while/);
  assert.ok(scripts[0].includes('playlist "My \\"Playlist\\""'));
  assert.match(scripts[0], /smart of targetPlaylist/);
});

test("adding to a smart Favorite Songs playlist favorites the track instead of duplicating it", async () => {
  const scripts = [];
  const currentTrack = loadSource(
    "src/util/scripts/current-track.ts",
    async (script) => {
      scripts.push(script);
      if (script.includes("get smart of playlist")) return "true";
      if (script.includes("get favorited of current track")) return "true";
      return "";
    },
    { "../get-macos-version": { getMacosVersion: async () => ({ major: 27, minor: 0, patch: 0 }) } },
  );

  assert.equal((await currentTrack.addToPlaylist("Favourite Songs")())._tag, "Right");
  assert.equal(scripts.length, 3);
  assert.ok(scripts.some((script) => script.includes("set favorited of current track to true")));
  assert.ok(scripts.every((script) => !script.includes("duplicate playingTrack")));
});

test("a regular playlist named Favorite Songs still receives a duplicate", async () => {
  const scripts = [];
  const currentTrack = loadSource("src/util/scripts/current-track.ts", async (script) => {
    scripts.push(script);
    return script.includes("get smart of playlist") ? "false" : "";
  });

  assert.equal((await currentTrack.addToPlaylist("Favorite Songs")())._tag, "Right");
  assert.equal(scripts.length, 2);
  assert.ok(scripts[1].includes("duplicate (item 1 of existingTracks) to targetPlaylist"));
});

test("subscription tracks are added to the library source before the playlist", async () => {
  const scripts = [];
  const currentTrack = loadSource("src/util/scripts/current-track.ts", async (script) => {
    scripts.push(script);
    return "";
  });

  assert.equal((await currentTrack.addToPlaylist("Road Trip")())._tag, "Right");
  assert.match(
    scripts[0],
    /duplicate playingTrack to library playlist 1\s+on error number -10006\s+duplicate playingTrack to source 1/,
  );
});

test("subprocess execution drains stdout and stderr concurrently", async () => {
  const { execute } = loadSource("src/util/exec.ts");
  const output = await execute(
    process.execPath,
    "-e",
    'process.stderr.write("x".repeat(256000)); process.stdout.write("done");',
  );
  assert.equal(output, "done");
});

test("subprocess errors and signal termination reject", async () => {
  const { execute } = loadSource("src/util/exec.ts");
  await assert.rejects(execute("/missing-music-test-executable"), /ENOENT/);
  await assert.rejects(execute(process.execPath, "-e", 'process.stderr.write("failure"); process.exit(3);'), /failure/);
  await assert.rejects(execute(process.execPath, "-e", 'process.kill(process.pid, "SIGTERM");'), { signal: "SIGTERM" });
});

test("a stuck subprocess is terminated and reaped at the deadline", { timeout: 15000 }, async () => {
  const { execute } = loadSource("src/util/exec.ts");
  await assert.rejects(
    execute(process.execPath, "-e", 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);'),
    {
      killed: true,
      signal: "SIGKILL",
    },
  );
});
