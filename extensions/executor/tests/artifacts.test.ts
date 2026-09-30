import { describe, expect, test } from "bun:test";
import {
  artifactRenamePayload,
  artifactUpsertPayload,
  artifactSearchKeywords,
  escapeMarkdown,
  safeArtifactUrl,
  validateArtifactTitle,
  normalizeArtifactMetadata,
} from "../src/lib/artifacts";

describe("artifact library boundaries", () => {
  test("accepts HTTPS and loopback HTTP links without embedded credentials", () => {
    expect(safeArtifactUrl("https://executor.sh/acme/artifacts/art_1")).toBe(
      "https://executor.sh/acme/artifacts/art_1",
    );
    expect(safeArtifactUrl("http://127.0.0.1:4788/artifacts/art_1")).toBe("http://127.0.0.1:4788/artifacts/art_1");
    expect(safeArtifactUrl("http://executor.sh/artifacts/art_1")).toBeUndefined();
    expect(safeArtifactUrl("https://user:secret@executor.sh/artifacts/art_1")).toBeUndefined();
    expect(safeArtifactUrl("javascript:alert(1)")).toBeUndefined();
  });

  test("requires a non-empty title while preserving arbitrary casing", () => {
    expect(validateArtifactTitle("   ")).toBe("A title is required.");
    expect(validateArtifactTitle("Q3 API SLA")).toBeUndefined();
    expect(artifactRenamePayload("  Q3 API SLA  ")).toEqual({ title: "Q3 API SLA" });
  });

  test("distinguishes an omitted description from an explicit clear", () => {
    expect(normalizeArtifactMetadata({ title: " New title " })).toEqual({ title: "New title" });
    expect(normalizeArtifactMetadata({ description: "   " })).toEqual({ description: null });
    expect(() => normalizeArtifactMetadata({})).toThrow("Provide a title or description");
  });

  test("builds a metadata overwrite without dropping source or bindings", () => {
    const artifact = {
      id: "art_1",
      owner: "user" as const,
      title: "Old title",
      description: "Old description",
      preview: null,
      code: "return await tools.github.user.default.issues_list({});",
      bindings: { github: { integration: "github", owner: "user" as const, connection: "default" } },
      createdAt: 1,
      updatedAt: 2,
    };
    expect(artifactUpsertPayload(artifact, normalizeArtifactMetadata({ description: " New description " }))).toEqual({
      id: "art_1",
      title: "Old title",
      description: "New description",
      code: artifact.code,
      bindings: artifact.bindings,
    });
  });

  test("searches descriptions, IDs and friendly owner labels", () => {
    expect(
      artifactSearchKeywords({
        id: "art_123",
        owner: "org",
        title: "Revenue",
        description: "Quarterly pipeline",
        preview: null,
        createdAt: 1,
        updatedAt: 2,
      }),
    ).toEqual(["art_123", "Quarterly pipeline", "Workspace"]);
  });

  test("escapes stored titles before placing them in Markdown", () => {
    expect(escapeMarkdown("[Revenue](https://evil.example)")).toBe("\\[Revenue\\](https://evil.example)");
  });
});
