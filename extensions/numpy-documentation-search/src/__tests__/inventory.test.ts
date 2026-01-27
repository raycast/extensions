import { describe, expect, it } from "vitest";
import { dedupeAndFilter } from "../lib/inventory";

describe("dedupeAndFilter", () => {
  it("filters out private members starting with single underscore", () => {
    const lines = [
      {
        name: "numpy.linspace",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.linspace.html#numpy.linspace",
        displayName: "linspace",
      },
      {
        name: "numpy._private_func",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy._private_func.html#numpy._private_func",
        displayName: "_private_func",
      },
      {
        name: "numpy.ndarray._internal",
        role: "py:method",
        priority: 1,
        uri: "reference/generated/numpy.ndarray._internal.html#numpy.ndarray._internal",
        displayName: "_internal",
      },
    ];

    const result = dedupeAndFilter(lines);

    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("numpy.linspace");
    expect(result.some((item) => item.id === "numpy._private_func")).toBe(false);
    expect(result.some((item) => item.id === "numpy.ndarray._internal")).toBe(false);
  });

  it("filters out private members starting with double underscore", () => {
    const lines = [
      {
        name: "numpy.array",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.array.html#numpy.array",
        displayName: "array",
      },
      {
        name: "numpy.__version__",
        role: "py:data",
        priority: 1,
        uri: "reference/generated/numpy.__version__.html#numpy.__version__",
        displayName: "__version__",
      },
    ];

    const result = dedupeAndFilter(lines);

    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("numpy.array");
    expect(result.some((item) => item.id === "numpy.__version__")).toBe(false);
  });

  it("keeps public members with no underscore prefix", () => {
    const lines = [
      {
        name: "numpy.linspace",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.linspace.html#numpy.linspace",
        displayName: "linspace",
      },
      {
        name: "numpy.linalg.norm",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.linalg.norm.html#numpy.linalg.norm",
        displayName: "linalg.norm",
      },
    ];

    const result = dedupeAndFilter(lines);

    expect(result.length).toBe(2);
    expect(result.some((item) => item.id === "numpy.linspace")).toBe(true);
    expect(result.some((item) => item.id === "numpy.linalg.norm")).toBe(true);
  });

  it("filters based on any segment starting with underscore", () => {
    const lines = [
      {
        name: "numpy.ma.array",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.ma.array.html#numpy.ma.array",
        displayName: "ma.array",
      },
      {
        name: "numpy.ma._private",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.ma._private.html#numpy.ma._private",
        displayName: "ma._private",
      },
      {
        name: "numpy.__array_namespace_info__.capabilities",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.__array_namespace_info__.capabilities.html",
        displayName: "__array_namespace_info__.capabilities",
      },
    ];

    const result = dedupeAndFilter(lines);

    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("numpy.ma.array");
    expect(result.some((item) => item.id === "numpy.ma._private")).toBe(false);
    expect(result.some((item) => item.id === "numpy.__array_namespace_info__.capabilities")).toBe(false);
  });

  it("removes hash fragments from URLs", () => {
    const lines = [
      {
        name: "numpy.absolute",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.absolute.html#numpy.absolute",
        displayName: "absolute",
      },
      {
        name: "numpy.linalg.norm",
        role: "py:function",
        priority: 1,
        uri: "reference/generated/numpy.linalg.norm.html#numpy.linalg.norm",
        displayName: "linalg.norm",
      },
    ];

    const result = dedupeAndFilter(lines);

    expect(result.length).toBe(2);
    // URLs should not contain hash fragments
    expect(result[0]?.url).toBe("https://numpy.org/doc/stable/reference/generated/numpy.absolute.html");
    expect(result[1]?.url).toBe("https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html");
    // But docPath should still contain them for HTML parsing
    expect(result[0]?.docPath).toBe("reference/generated/numpy.absolute.html#numpy.absolute");
    expect(result[1]?.docPath).toBe("reference/generated/numpy.linalg.norm.html#numpy.linalg.norm");
  });
});
