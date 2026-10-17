import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { documentKind, humanizeType } from "./document-kinds.ts"

describe("documentKind", () => {
  it("names the first-party types", () => {
    assert.deepEqual(documentKind("card"), { label: "Card", icon: "Layers" })
    assert.deepEqual(documentKind("notes"), { label: "Note", icon: "Text" })
    assert.deepEqual(documentKind("family-tree-v2"), {
      label: "Family Tree",
      icon: "Tree",
    })
  })

  it("gives an installed tool's type a readable label and a generic icon", () => {
    assert.deepEqual(documentKind("hex-map"), {
      label: "Hex Map",
      icon: "Document",
    })
    assert.deepEqual(documentKind("fixture.publisher:weather-doc"), {
      label: "Fixture Publisher Weather Doc",
      icon: "Document",
    })
  })

  it("never returns a blank", () => {
    assert.deepEqual(documentKind(null), {
      label: "Document",
      icon: "Document",
    })
    assert.deepEqual(documentKind(""), { label: "Document", icon: "Document" })
  })
})

describe("humanizeType", () => {
  it("title-cases on separators", () => {
    assert.equal(humanizeType("todo-list"), "Todo List")
    assert.equal(humanizeType("a__b"), "A B")
  })
})
