import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCookiesFromBrowserArg } from "./utils.js";

describe("formatCookiesFromBrowserArg", () => {
  it("returns undefined when browser is 'none' or undefined", () => {
    assert.equal(formatCookiesFromBrowserArg("none", undefined), undefined);
    assert.equal(formatCookiesFromBrowserArg(undefined, undefined), undefined);
  });

  it("returns browser name when browser is not firefox", () => {
    assert.equal(formatCookiesFromBrowserArg("chrome", undefined), "chrome");
    assert.equal(formatCookiesFromBrowserArg("chrome", "Personal"), "chrome");
  });

  it("returns firefox::ContainerName when browser is firefox and container is provided", () => {
    assert.equal(formatCookiesFromBrowserArg("firefox", "Personal"), "firefox::Personal");
    assert.equal(formatCookiesFromBrowserArg("firefox", "  work  "), "firefox::work");
    assert.equal(formatCookiesFromBrowserArg("firefox", "::Personal"), "firefox::Personal");
  });

  it("returns firefox when browser is firefox and container is empty or whitespace", () => {
    assert.equal(formatCookiesFromBrowserArg("firefox", ""), "firefox");
    assert.equal(formatCookiesFromBrowserArg("firefox", "   "), "firefox");
    assert.equal(formatCookiesFromBrowserArg("firefox", "::"), "firefox");
    assert.equal(formatCookiesFromBrowserArg("firefox", undefined), "firefox");
  });
});
