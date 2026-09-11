import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  queryArtistAlbums,
  queryArtistAlbumTracks,
  queryLibraryFacets,
  queryLibraryTracksByFacet,
} from "../src/libraryDatabase";

function createFixtureDatabase(): { databasePath: string; cleanup: () => void } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "swinsian-library-test-"));
  const databasePath = path.join(directory, "Library.sqlite");
  const statements = `
    CREATE TABLE track (
      track_id INTEGER PRIMARY KEY,
      title TEXT,
      artist TEXT,
      album TEXT,
      genre TEXT,
      year INTEGER,
      length FLOAT,
      rating INTEGER,
      path TEXT,
      albumartist TEXT,
      discnumber INTEGER,
      tracknumber INTEGER,
      enabled INTEGER
    );
    INSERT INTO track VALUES
      (1, 'First', 'Alpha', 'One', 'Metal', 2024, 65.2, 4, '/Music/First.flac', 'Alpha', 1, 1, 1),
      (2, 'Second', 'Alpha', 'One', 'Metal', 2024, 125.8, 0, '/Music/Second.flac', 'Alpha', 1, 2, 1),
      (3, 'Third', 'Beta', 'Two', 'Rock', 2023, 3600, 5, '/Music/Third.flac', '', 1, 1, 1),
      (4, 'Disabled', 'Gamma', 'Three', 'Rock', 2022, 90, 3, '/Music/Disabled.flac', 'Gamma', 1, 1, 0),
      (5, 'Other', 'Beta', 'One', 'Metal', 2024, 90, 0, '/Music/Other.flac', 'Beta', 1, 1, 1);

  `;
  execFileSync("/usr/bin/sqlite3", [databasePath, statements]);
  return { databasePath, cleanup: () => fs.rmSync(directory, { recursive: true, force: true }) };
}

test("facet queries group enabled tracks on disk and apply search and result bounds", async () => {
  const fixture = createFixtureDatabase();
  try {
    const artists = await queryLibraryFacets(fixture.databasePath, "artist", "", 1);
    assert.deepEqual(artists, [{ value: "Alpha", title: "Alpha", subtitle: "Metal", count: 1 }]);

    const filtered = await queryLibraryFacets(fixture.databasePath, "genre", "rock", 20);
    assert.deepEqual(filtered, [{ value: "Rock", title: "Rock", count: 1 }]);
  } finally {
    fixture.cleanup();
  }
});

test("facet track queries return a bounded lightweight payload with formatted duration", async () => {
  const fixture = createFixtureDatabase();
  try {
    const tracks = await queryLibraryTracksByFacet(fixture.databasePath, "artist", "Alpha", "second", 1);
    assert.deepEqual(tracks, [
      {
        name: "Second",
        artist: "Alpha",
        album: "One",
        duration: 125.8,
        time: "2:06",
        rating: 0,
        id: "2",
        path: "/Music/Second.flac",
      },
    ]);
  } finally {
    fixture.cleanup();
  }
});

test("album facets keep same-titled releases separate by effective artist", async () => {
  const fixture = createFixtureDatabase();
  try {
    const albums = await queryLibraryFacets(fixture.databasePath, "album", "One", 20);
    assert.deepEqual(
      albums.map((album) => ({ title: album.title, artist: album.artist, year: album.year })),
      [
        { title: "One", artist: "Alpha", year: 2024 },
        { title: "One", artist: "Beta", year: 2024 },
      ],
    );

    const alphaTracks = await queryLibraryTracksByFacet(fixture.databasePath, "album", "One", "", 20, "Alpha");
    const betaTracks = await queryLibraryTracksByFacet(fixture.databasePath, "album", "One", "", 20, "Beta");
    assert.deepEqual(
      alphaTracks.map((track) => track.name),
      ["First", "Second"],
    );
    assert.deepEqual(
      betaTracks.map((track) => track.name),
      ["Other"],
    );
  } finally {
    fixture.cleanup();
  }
});

test("artist browsing groups albums before returning their tracks", async () => {
  const fixture = createFixtureDatabase();
  try {
    const albums = await queryArtistAlbums(fixture.databasePath, "artist", "Alpha", "", 20);
    assert.deepEqual(albums, [{ album: "One", artist: "Alpha", year: 2024, count: 2 }]);

    const tracks = await queryArtistAlbumTracks(fixture.databasePath, "artist", "Alpha", "One", "", 20);
    assert.deepEqual(
      tracks.map((track) => track.name),
      ["First", "Second"],
    );
  } finally {
    fixture.cleanup();
  }
});
