import { describe, expect, it } from "vitest";
import { chooseOpenTarget, signInLinkUrl, threadWebUrl } from "./open";

describe("chooseOpenTarget", () => {
  it("uses the app when it's installed and nothing overrides", () => {
    expect(chooseOpenTarget("T1", { preference: "auto", appInstalled: true })).toEqual({
      kind: "app",
      url: "nyxe://thread/T1",
    });
  });

  it("falls back to the browser when the app isn't installed", () => {
    expect(chooseOpenTarget("T1", { preference: "auto", appInstalled: false })).toEqual({
      kind: "browser",
      url: "https://nyxe.app/m?thread=T1",
    });
  });

  it("honours the preference either way", () => {
    expect(chooseOpenTarget("T1", { preference: "browser", appInstalled: true }).kind).toBe("browser");
    expect(chooseOpenTarget("T1", { preference: "app", appInstalled: false }).kind).toBe("app");
  });

  it("never builds an app link from an id the app would refuse", () => {
    const target = chooseOpenTarget("../settings", { preference: "app", appInstalled: true });
    expect(target).toEqual({ kind: "browser", url: "https://nyxe.app/m?thread=..%2Fsettings" });
  });

  it("uses the deployment's web app", () => {
    expect(threadWebUrl("T1", "http://localhost:5178/")).toBe("http://localhost:5178/m?thread=T1");
  });
});

describe("signInLinkUrl", () => {
  it("accepts an https link", () => {
    expect(signInLinkUrl("https://example.com/verify?t=1")?.hostname).toBe("example.com");
  });

  it("refuses any other scheme, or a value that isn't a URL", () => {
    expect(signInLinkUrl("http://example.com/verify")).toBeUndefined();
    expect(signInLinkUrl("file:///etc/passwd")).toBeUndefined();
    expect(signInLinkUrl("javascript:alert(1)")).toBeUndefined();
    expect(signInLinkUrl("not a url")).toBeUndefined();
  });
});
