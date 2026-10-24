import { describe, expect, it } from "vitest";
import { buildManifest, displayTitle, encodeRepositoryPath } from "../scripts/sync-data-lib.mjs";

const commit = "a".repeat(40);
const sourceText = `
  const initialState = {
    myGOImages: [{ name: "春日影_2", episode: 7 }],
    aveMujicaImages: [{ name: "祝夜晚愉快", episode: 1 }],
  };
`;
const treePaths = [
  "src/assets/webp/mygo/春日影_2.webp",
  "src/assets/jpg/mygo/春日影_2.jpg",
  "src/assets/webp/ave-mujica/祝夜晚愉快.webp",
  "src/assets/jpg/ave-mujica/祝夜晚愉快.jpg",
];

describe("manifest sync", () => {
  it("creates deterministic, commit-pinned metadata", () => {
    const first = buildManifest({ commit, sourceText, treePaths });
    const second = buildManifest({ commit, sourceText, treePaths });
    expect(first).toEqual(second);
    expect(first.screenshots).toHaveLength(2);
    expect(first.screenshots[0]).toMatchObject({ id: "mygo/春日影_2", title: "春日影", episode: 7 });
    expect(first.screenshots[0].previewUrl).toContain(`/${commit}/`);
  });

  it("encodes every repository path segment", () => {
    expect(encodeRepositoryPath("src/assets/my image/春日影.webp")).toBe(
      "src/assets/my%20image/%E6%98%A5%E6%97%A5%E5%BD%B1.webp",
    );
    expect(displayTitle("台詞_12")).toBe("台詞");
  });

  it("fails when an expected asset is missing", () => {
    expect(() => buildManifest({ commit, sourceText, treePaths: treePaths.slice(0, 3) })).toThrow("missing assets");
  });

  it("rejects a screenshot assigned to different episodes", () => {
    const conflictingSource = `
      const initialState = {
        myGOImages: [{ name: "same", episode: 1 }, { name: "same", episode: 2 }],
        aveMujicaImages: [],
      };
    `;
    expect(() =>
      buildManifest({
        commit,
        sourceText: conflictingSource,
        treePaths: ["src/assets/webp/mygo/same.webp", "src/assets/jpg/mygo/same.jpg"],
      }),
    ).toThrow("episodes 1 and 2");
  });
});
