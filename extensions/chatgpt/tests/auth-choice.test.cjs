const assert = require("node:assert/strict");
const { test } = require("node:test");
const { selectAuthProvider } = require("../src/utils/auth-choice.ts");

test("API key preference keeps the existing API key first behavior", () => {
  assert.equal(selectAuthProvider("apiKey", true, true), "apiKey");
  assert.equal(selectAuthProvider("apiKey", false, true), "chatgpt");
  assert.equal(selectAuthProvider("apiKey", false, false), "none");
});

test("ChatGPT preference falls back to the API key when signed out", () => {
  assert.equal(selectAuthProvider("chatgpt", true, true), "chatgpt");
  assert.equal(selectAuthProvider("chatgpt", true, false), "apiKey");
  assert.equal(selectAuthProvider("chatgpt", false, false), "none");
});
