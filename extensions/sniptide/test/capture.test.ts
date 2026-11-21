import { describe, expect, test } from "bun:test"
import { captureFromText, fileNameFor, titleFor, validFileName } from "../src/lib/capture"

describe("titleFor", () => {
  test("uses the first line that holds text", () => {
    expect(titleFor("\n\n  const a = 1\nconst b = 2")).toBe("const a = 1")
  })

  test("shortens a long line to 60 characters", () => {
    const title = titleFor("x".repeat(200))
    expect(title).toHaveLength(60)
    expect(title.endsWith("…")).toBe(true)
  })

  test("names text without a readable line", () => {
    expect(titleFor("  \n\t")).toBe("Untitled paste")
  })
})

describe("fileNameFor", () => {
  test("recognizes valid JSON", () => {
    expect(fileNameFor('  {"a": [1, 2]}\n')).toBe("snippet.json")
    expect(fileNameFor("[1, 2]")).toBe("snippet.json")
  })

  test("treats everything else as plain text", () => {
    expect(fileNameFor("{ not json }")).toBe("snippet.txt")
    expect(fileNameFor("42")).toBe("snippet.txt")
    expect(fileNameFor("const a = 1")).toBe("snippet.txt")
  })
})

describe("validFileName", () => {
  test("accepts a plain name", () => {
    expect(validFileName("snippet.ts")).toBe(true)
    expect(validFileName("Dockerfile")).toBe(true)
  })

  test("refuses empty names, paths and names over 120 characters", () => {
    expect(validFileName("  ")).toBe(false)
    expect(validFileName("src/a.ts")).toBe(false)
    expect(validFileName("a\\b.ts")).toBe(false)
    expect(validFileName("..")).toBe(false)
    expect(validFileName("a".repeat(121))).toBe(false)
  })
})

describe("captureFromText", () => {
  test("fills in the title and file name from the text", () => {
    expect(captureFromText("SELECT 1;\n", { visibility: "unlisted" })).toEqual({
      title: "SELECT 1;",
      visibility: "unlisted",
      files: [{ name: "snippet.txt", content: "SELECT 1;\n" }],
    })
  })

  test("keeps the reader's title, file name and collection", () => {
    expect(
      captureFromText("SELECT 1;", {
        visibility: "private",
        title: "  Health check  ",
        fileName: " health.sql ",
        collection: "queries",
      }),
    ).toEqual({
      title: "Health check",
      visibility: "private",
      collection: "queries",
      files: [{ name: "health.sql", content: "SELECT 1;" }],
    })
  })

  test("sends the text unchanged and leaves out an empty collection", () => {
    const input = captureFromText("  indented\n", { visibility: "public", collection: null })
    expect(input.files[0]?.content).toBe("  indented\n")
    expect("collection" in input).toBe(false)
  })

  test("shortens a title past 120 characters", () => {
    const input = captureFromText("a", { visibility: "unlisted", title: "t".repeat(300) })
    expect(input.title).toHaveLength(120)
  })
})
