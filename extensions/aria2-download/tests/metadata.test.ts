import assert from "node:assert/strict";
import test from "node:test";

import { isMetadataTask } from "../src/lib/task-type";

const base = {
  gid: "x",
  status: "active",
  totalLength: "0",
  completedLength: "0",
  uploadLength: "0",
  downloadSpeed: "0",
  uploadSpeed: "0",
  connections: "0",
  dir: "",
  files: [],
} as const;

test("active bittorrent without length is metadata", () => {
  assert.equal(isMetadataTask({ ...base, bittorrent: {} }), true);
});

test("active bittorrent with length is a real download", () => {
  assert.equal(
    isMetadataTask({ ...base, totalLength: "100", bittorrent: {} }),
    false,
  );
});

test("completed metadata is not active metadata", () => {
  assert.equal(
    isMetadataTask({
      ...base,
      status: "complete",
      totalLength: "512",
      bittorrent: {},
    }),
    false,
  );
});
