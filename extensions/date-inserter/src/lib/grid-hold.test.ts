import { describe, expect, it } from "vitest";
import { gridHold } from "./grid-hold";

const rowOf = (value: number) => String(Math.floor(value / 4));
const pageOf = (value: number) => String(Math.floor(value / 12));

describe("gridHold", () => {
  it("shows left/right holds when the row changes", () => {
    const hold = gridHold("arrowRight", rowOf)!;
    expect(hold.key).toBe("arrowRight");
    expect(hold.isBoundary(1, 3)).toBe(false);
    expect(hold.isBoundary(3, 4)).toBe(true);
  });

  it("also shows left/right holds when the page changes", () => {
    // Same row id but different page, like a week spanning two months.
    const sameRow = () => "row";
    expect(gridHold("arrowLeft", sameRow, pageOf)!.isBoundary(12, 11)).toBe(true);
    expect(gridHold("arrowLeft", sameRow, pageOf)!.isBoundary(11, 10)).toBe(false);
  });

  it("shows up/down holds only when the page changes", () => {
    const hold = gridHold("arrowDown", rowOf, pageOf)!;
    expect(hold.isBoundary(0, 4)).toBe(false);
    expect(hold.isBoundary(8, 12)).toBe(true);
  });

  it("leaves up/down to plain throttling without pages", () => {
    expect(gridHold("arrowUp", rowOf)).toBeUndefined();
  });
});
