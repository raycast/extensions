import test from "node:test";
import assert from "node:assert/strict";
import { decodeJWT, validateQuickLink, quickLinkDescription } from "../src/jwt.ts";

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (header, payload) => [encode(header), encode(payload), ""].join(".");

test("decodes UTF-8 claims and preserves custom fields without signature verification", () => {
  const payload = { sub: "测试用户", exp: 0, aud: ["one", "two"], custom: { nested: true } };
  assert.deepEqual(decodeJWT(token({ alg: "none" }, payload)).payload, payload);
});

test("rejects non-object header/payload before rendering the result view", () => {
  for (const value of [null, [], "text", 123, true]) {
    assert.throws(() => decodeJWT(token({ alg: "none" }, value)), /payload must be a JSON object/);
    assert.throws(() => decodeJWT(token(value, {})), /header must be a JSON object/);
  }
});

test("rejects malformed claims, timestamps and encodings with generic errors", () => {
  for (const payload of [{ exp: "123" }, { nbf: null }, { exp: 1e50 }, { aud: [42] }, { sub: {} }, { jti: [] }]) {
    assert.throws(() => decodeJWT(token({ alg: "none" }, payload)), /Invalid JWT/);
  }
  for (const header of [{}, { alg: null }, { alg: "HS256", kid: [] }]) {
    assert.throws(() => decodeJWT(token(header, {})), /Invalid JWT/);
  }
  for (const value of ["", "x.y", "%%%.e30.", "a.e30.", `${encode({ alg: "none" })}.${encode({})}.!!`]) {
    assert.throws(() => decodeJWT(value), /Invalid JWT/);
  }
});

test("quick links validate input and preview contains actual Markdown newlines", () => {
  const jwt = token({ alg: "none" }, { sub: "fixture" });
  assert.deepEqual(validateQuickLink(" Test ", ` ${jwt} `), { name: "Test", jwt });
  assert.throws(() => validateQuickLink(" ", jwt), /name/);
  assert.throws(() => validateQuickLink("Test", "invalid"), /Invalid JWT/);
  assert.match(quickLinkDescription("Test"), /\n\nPress/);
  assert.ok(!quickLinkDescription("Test").includes("\\n"));
});
