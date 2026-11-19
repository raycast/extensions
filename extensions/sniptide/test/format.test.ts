import { describe, expect, test } from "bun:test"
import { fileMarkdown, languageLabel, lineCount, pasteMarkdown } from "../src/lib/format"

describe("fileMarkdown", () => {
  test("fences the code with its language", () => {
    expect(fileMarkdown({ content: "const a = 1", language: "TypeScript" })).toBe(
      "```typescript\nconst a = 1\n```",
    )
  })

  test("leaves plain text without a language", () => {
    expect(fileMarkdown({ content: "hello", language: "plaintext" })).toBe("```\nhello\n```")
  })

  test("uses a fence longer than any run of backticks in the code", () => {
    const content = "```js\nconsole.log(1)\n```"
    const markdown = fileMarkdown({ content, language: "markdown" })
    expect(markdown.startsWith("````markdown\n")).toBe(true)
    expect(markdown.endsWith("\n````")).toBe(true)
  })

  test("handles a large paste with many separate backtick runs", () => {
    const content = "`x".repeat(200_000) + "`````"
    expect(fileMarkdown({ content, language: "text" })).toBe("``````\n" + content + "\n``````")
  })

  test("drops a language name that could break the fence", () => {
    expect(fileMarkdown({ content: "x", language: "weird lang`" })).toBe("```\nx\n```")
  })
})

describe("pasteMarkdown", () => {
  const file = (name: string, content: string) => ({ name, content, language: "plaintext" })

  test("shows a single file as one block", () => {
    expect(pasteMarkdown({ files: [file("a.txt", "one")] })).toBe("```\none\n```")
  })

  test("names each file when there are several", () => {
    expect(pasteMarkdown({ files: [file("a.txt", "one"), file("b.txt", "two")] })).toBe(
      "**a.txt**\n\n```\none\n```\n\n**b.txt**\n\n```\ntwo\n```",
    )
  })
})

describe("lineCount", () => {
  test("counts lines without the final newline", () => {
    expect(lineCount("")).toBe(0)
    expect(lineCount("a")).toBe(1)
    expect(lineCount("a\nb\n")).toBe(2)
    expect(lineCount("a\n\nb")).toBe(3)
  })
})

describe("languageLabel", () => {
  test("names one language and counts the rest", () => {
    expect(languageLabel({ languages: [] })).toBeNull()
    expect(languageLabel({ languages: ["plaintext"] })).toBeNull()
    expect(languageLabel({ languages: ["typescript"] })).toBe("typescript")
    expect(languageLabel({ languages: ["typescript", "plaintext", "css"] })).toBe("typescript +1")
  })
})
