import assert from "node:assert/strict";
import { test } from "node:test";
import type { LaunchType } from "@raycast/api";
import type { SaveOptions } from "../src/lib/capture";
import { loadSource } from "./load-source";

test("Quick Save reports invalid tags and rejected saves without rejecting the command", async () => {
  const failures: { error: Error; title: string }[] = [];
  const captures: { url: string | null; options: SaveOptions }[] = [];
  let reject = false;
  const { default: Command } = await loadSource<typeof import("../src/quick-save")>("quick-save.ts", {
    "./components/problem": {
      showFailure: async (error: Error, title: string) => failures.push({ error, title }),
    },
    "./lib/capture": {
      findUrl: async () => ({ url: "https://clipboard.example/" }),
      saveWithToast: async (resolveUrl: () => Promise<string | null>, options: SaveOptions) => {
        if (reject) throw new Error("Save failed");
        captures.push({ url: await resolveUrl(), options });
      },
    },
  });
  const props = {
    launchType: "userInitiated" as LaunchType,
    arguments: { url: " https://example.com ", tags: Array.from({ length: 101 }, (_, i) => `tag${i}`).join(",") },
    launchContext: { folderId: "folder-1" },
  };
  await assert.doesNotReject(Command(props));
  assert.equal(failures.length, 1);
  assert.equal(failures[0].error.message, "Use 100 tags or fewer.");
  assert.equal(failures[0].title, "Couldn't save the URL");
  assert.equal(captures.length, 0);

  props.arguments.tags = "#design, Design, reference";
  await Command(props);
  assert.equal(captures[0].url, "https://example.com/");
  assert.deepEqual(captures[0].options.tags, ["design", "reference"]);
  assert.equal(captures[0].options.folderId, "folder-1");
  props.arguments.url = "";
  await Command(props);
  assert.equal(captures[1].url, "https://clipboard.example/");

  reject = true;
  await assert.doesNotReject(Command(props));
  assert.equal(failures.length, 2);
  assert.equal(failures[1].error.message, "Save failed");
});
