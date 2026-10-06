import { describe, expect, it } from "vitest";
import { isWorkPath } from "./work-directory";

describe("isWorkPath", () => {
  it("matches a work segment anywhere in the path", () => {
    expect(isWorkPath("~/dotfiles/profiles/work/scripts")).toBe(true);
    expect(isWorkPath("/Users/jane/work/scripts")).toBe(true);
  });

  it("leaves anything else personal", () => {
    expect(isWorkPath("~/scripts")).toBe(false);
    expect(isWorkPath("/Users/jane/scripts")).toBe(false);
    expect(isWorkPath("")).toBe(false);
  });

  it("matches whole segments only", () => {
    expect(isWorkPath("~/workscripts")).toBe(false);
    expect(isWorkPath("/Users/jane/homework/scripts")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isWorkPath("/Users/jane/Work/scripts")).toBe(false);
  });
});
