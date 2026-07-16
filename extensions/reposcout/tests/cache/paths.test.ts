import { describe, expect, it } from "vitest";
import {
  INDEX_FILENAME,
  USER_DATA_FILENAME,
  indexFilePath,
  userDataFilePath,
} from "../../src/cache/paths";

describe("cache paths", () => {
  it("joins the support path with the index filename", () => {
    expect(indexFilePath("/support")).toBe(`/support/${INDEX_FILENAME}`);
  });

  it("joins the support path with the user-data filename", () => {
    expect(userDataFilePath("/support")).toBe(`/support/${USER_DATA_FILENAME}`);
  });

  it("uses distinct filenames", () => {
    expect(INDEX_FILENAME).not.toBe(USER_DATA_FILENAME);
  });
});
