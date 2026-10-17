const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadSource } = require("./database-fixture.cjs");

test("opening a page by GUID does not depend on a named-container account cache", async () => {
  let opened;
  let closed = false;
  const source = loadSource("utils", {
    "./types": loadSource("types", {}),
    "./search": loadSource("search", {}),
    "@raycast/api": {
      closeMainWindow: () => {
        closed = true;
      },
      LocalStorage: {
        getItem: () => {
          throw new Error("Account cache must not be read for a page GUID");
        },
      },
    },
    child_process: {
      exec: (command, callback) => {
        opened = command;
        callback();
      },
    },
    fs: {
      readdirSync: () => {
        throw new Error("Named OneNote container does not exist");
      },
    },
    dateformat: () => "",
    "run-applescript": {},
  });
  await source.openNote({ Type: 1, GUID: "{12345678-1234-1234-1234-123456789abc}" });
  assert.equal(opened, "open onenote:#page-id=%7B12345678-1234-1234-1234-123456789abc%7D");
  assert.equal(closed, true);
});
