import assert from "node:assert/strict"
import { test } from "node:test"
import { answerDeepWikiQuestion } from "../src/answer-deepwiki-question"
import { getDeepWikiPage } from "../src/get-deepwiki-page"

const url = "https://deepwiki.com/owner/repo"

test("the reader retains documentation beyond character 30,000", async (t) => {
  const content = `${"a".repeat(31000)} The cache expires after 42 seconds.`
  t.mock.method(globalThis, "fetch", async (input: string) => {
    assert.equal(input, url)
    return new Response(`<div class="prose-custom">${content}</div>`)
  })

  assert.deepEqual(await getDeepWikiPage("owner/repo"), { url, content })
})

test("short pages need only one AI request", async () => {
  const prompts: string[] = []
  const answer = await answerDeepWikiQuestion(
    "When does the cache expire?",
    { url, content: "After 42 seconds." },
    async (prompt) => {
      prompts.push(prompt)
      return "After 42 seconds."
    },
  )

  assert.equal(answer, "After 42 seconds.")
  assert.equal(prompts.length, 1)
  assert.ok(prompts[0].includes("After 42 seconds."))
  assert.ok(prompts[0].includes(url))
})

test("long pages include facts from the ending in the final answer request", async () => {
  const prompts: string[] = []
  const content = `${"a".repeat(31000)} The cache expires after 42 seconds.`
  const answer = await answerDeepWikiQuestion("When does the cache expire?", { url, content }, async (prompt) => {
    prompts.push(prompt)
    if (prompts.length === 1) return "No relevant facts in this excerpt."
    if (prompts.length === 2) {
      assert.ok(prompt.includes("The cache expires after 42 seconds."))
      return "The cache expires after 42 seconds."
    }
    assert.ok(prompt.includes("The cache expires after 42 seconds."))
    assert.ok(prompt.includes(url))
    return "The cache expires after 42 seconds."
  })

  assert.equal(prompts.length, 3)
  assert.equal(answer, "The cache expires after 42 seconds.")
})

test("overlapping chunks preserve facts across a chunk boundary", async () => {
  const fact = "The cache expires after 42 seconds."
  const content = `${"a".repeat(29990)}${fact}${"b".repeat(31000)}`
  const prompts: string[] = []
  await answerDeepWikiQuestion("When does the cache expire?", { url, content }, async (prompt) => {
    prompts.push(prompt)
    return "Extracted facts."
  })

  assert.ok(prompts.slice(0, -1).some((prompt) => prompt.includes(fact)))
  assert.ok(prompts[prompts.length - 2].includes("b".repeat(1000)))
})
