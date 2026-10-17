import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  CAPTURE_KINDS,
  MAX_CARD_TEXT_BLOCK_CHARS,
  captureOps,
  isCaptureKind,
  splitParagraphs,
} from "./capture.ts"

describe("captureOps", () => {
  it("writes nothing for an empty body", () => {
    assert.deepEqual(captureOps("card", ""), [])
    assert.deepEqual(captureOps("notes", "  \n "), [])
  })

  it("puts a card's prose in one text block", () => {
    assert.deepEqual(captureOps("card", "  She keeps the ledger.  "), [
      { op: "card.addTextBlock", text: "She keeps the ledger." },
    ])
  })

  it("puts a note's text in its body", () => {
    assert.deepEqual(captureOps("notes", "[ ] ask about the ferry"), [
      { op: "notes.setBody", body: "[ ] ask about the ferry" },
    ])
  })

  it("splits a very long card capture across blocks on paragraph breaks", () => {
    const paragraph = "x".repeat(MAX_CARD_TEXT_BLOCK_CHARS - 10)
    const ops = captureOps("card", `${paragraph}\n\n${paragraph}`)
    assert.equal(ops.length, 2)
    assert.equal(ops[0]!.text, paragraph)
    assert.equal(ops[1]!.text, paragraph)
  })
})

describe("splitParagraphs", () => {
  it("keeps short text whole and joins paragraphs that fit", () => {
    assert.deepEqual(splitParagraphs("a\n\nb", 100), ["a\n\nb"])
    assert.deepEqual(splitParagraphs("aaaa\n\nbbbb\n\ncc", 10), [
      "aaaa\n\nbbbb",
      "cc",
    ])
  })

  it("hard-cuts a single paragraph that is longer than the limit", () => {
    assert.deepEqual(splitParagraphs("abcdefghij", 4), ["abcd", "efgh", "ij"])
  })
})

describe("capture kinds", () => {
  it("offers card and note", () => {
    assert.deepEqual(
      CAPTURE_KINDS.map((k) => k.value),
      ["card", "notes"],
    )
    assert.equal(isCaptureKind("card"), true)
    assert.equal(isCaptureKind("map"), false)
  })
})
