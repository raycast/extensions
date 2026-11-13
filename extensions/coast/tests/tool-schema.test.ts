import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Published Raycast tool contracts", () => {
  it("builds schemas containing identity and every continuation path", () => {
    const output = mkdtempSync(join(tmpdir(), "coast-schema-test-"));
    try {
      const build = Bun.spawnSync(
        ["bun", "run", "ray", "build", "--output", output],
        {
          cwd: join(import.meta.dir, ".."),
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      assert.equal(build.exitCode, 0, build.stderr.toString());
      const manifest = JSON.parse(
        readFileSync(join(output, "package.json"), "utf8"),
      );
      const tools = new Map<string, any>(
        manifest.tools.map((tool: any) => [tool.name, tool]),
      );
      const property = (name: string, path: string) => {
        const value = path
          .split(".")
          .reduce((node, key) => node?.[key], tools.get(name)?.output);
        assert.ok(value, `${name} output is missing ${path}`);
        return value;
      };
      for (const name of [
        "search-captures",
        "find-related-moments",
        "use-saved-search",
        "app-breakdown",
        "sample-activity",
        "browse-timeline",
        "explore-around-moment",
        "get-ocr-boxes",
        "recent-activity",
        "list-coast-filters",
      ]) {
        for (const key of [
          "has_more",
          "next_offset",
          "total_count",
          "returned_count",
        ]) {
          property(name, `properties.pagination.properties.${key}`);
        }
      }
      for (const name of [
        "search-captures",
        "use-saved-search",
        "recent-activity",
        "list-coast-filters",
      ]) {
        property(name, "properties.next_input.properties.offset");
      }
      for (const [name, field] of [
        ["search-captures", "results"],
        ["find-related-moments", "matches"],
        ["use-saved-search", "results"],
        ["browse-timeline", "frames"],
      ]) {
        for (const key of [
          "frame_id",
          "timestamp",
          "application",
          "domain",
          "ocr_text",
          "warnings",
        ]) {
          property(name, `properties.${field}.items.properties.${key}`);
        }
      }
      for (const name of [
        "get-capture",
        "get-capture-image",
        "get-ocr-boxes",
        "get-accessibility-tree",
      ]) {
        property(name, "properties.frame_id");
        property(name, "properties.timestamp");
      }
      for (const [name, field] of [
        ["get-capture", "ocr_pagination"],
        ["get-accessibility-tree", "text_pagination"],
      ]) {
        property(name, `properties.${field}.properties.next_offset`);
        property(name, `properties.${field}.properties.unit`);
        property(name, "properties.next_character_offset");
      }
      property("get-adjacent-moment", "properties.capture.properties.frame_id");
      property("capture-current-screen", "properties.image_path");
    } finally {
      // Only this test's generated build directory is removed.
      rmSync(output, { recursive: true, force: true });
    }
  }, 30_000);
});
