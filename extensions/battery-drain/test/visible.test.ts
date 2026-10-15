import { describe, expect, it } from "vitest";
import { visibleRows } from "../src/analysis/visible";

const row = (pid: number, cpu: number, energy = cpu) => ({ pid, cpu, energy });

describe("visibleRows", () => {
  it("hides anything that would read as 1% CPU or less", () => {
    const rows = [row(1, 40), row(2, 15), row(3, 1.5), row(4, 1.49), row(5, 1), row(6, 0.2)];
    expect(visibleRows(rows).map((r) => r.pid)).toEqual([1, 2, 3]);
  });

  it("keeps a row whose battery cost clearly goes beyond CPU (GPU or wakeups)", () => {
    expect(visibleRows([row(1, 0.5, 14)]).map((r) => r.pid)).toEqual([1]);
    expect(visibleRows([row(1, 0.3, 4)]).map((r) => r.pid)).toEqual([]);
  });

  it("caps the list at five", () => {
    const rows = [1, 2, 3, 4, 5, 6, 7].map((pid) => row(pid, 10));
    expect(visibleRows(rows)).toHaveLength(5);
  });

  it("always keeps a runaway, even outside the top five", () => {
    const rows = [1, 2, 3, 4, 5, 6, 7].map((pid) => row(pid, 10));
    expect(visibleRows(rows, new Set([7])).map((r) => r.pid)).toEqual([1, 2, 3, 4, 5, 7]);
  });
});
