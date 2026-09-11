import assert from "node:assert/strict";
import test from "node:test";
import { httpsImageUrl } from "../src/providers/shared.ts";

test("accepts only absolute HTTPS artwork URLs", () => {
  assert.equal(
    httpsImageUrl("https://assets.example.com/logo.png"),
    "https://assets.example.com/logo.png",
  );
  assert.equal(httpsImageUrl("http://assets.example.com/logo.png"), undefined);
  assert.equal(httpsImageUrl("javascript:alert(1)"), undefined);
  assert.equal(httpsImageUrl("/relative/logo.png"), undefined);
});
