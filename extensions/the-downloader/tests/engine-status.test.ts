import { describe, it, expect } from "vitest";
import {
  APPLE_SETTINGS_URL,
  EngineStatus,
  appleStatus,
  automaticStatus,
  ollamaStatus,
  raycastStatus,
  switchTarget,
} from "../src/lib/engine-status";

// Real `fm` output captured on macOS 27.0.1.
const NOT_AGREED =
  "\u001b[38;2;255;107;128mYOU HAVE NOT AGREED TO THE APPLE FOUNDATION MODELS CLI LEGAL NOTICE & TERMS.\nAgreeing to the Apple Foundation Models CLI Legal Notice & Terms applies to every user on the machine, so it must be run as a privileged user (e.g. 'sudo fm license').\n\u001b[0m";

const fixTypes = (s: EngineStatus) => (s.ready ? [] : s.fixes.map((f) => f.type));

describe("appleStatus", () => {
  it("is ready when `fm available` succeeds", () => {
    expect(appleStatus({ fmInstalled: true, code: 0, output: "" })).toMatchObject({ engine: "apple", ready: true });
  });

  it("says the model is still downloading, and to wait", () => {
    const s = appleStatus({ fmInstalled: true, code: 1, output: "System model unavailable: modelNotReady\n" });
    expect(s).toMatchObject({ ready: false, state: "downloading", waiting: true });
    expect(s.ready === false && s.title).toMatch(/still downloading/i);
    expect(s.ready === false && s.message).toMatch(/can take a while/);
    expect(s.ready === false && s.fixes).toContainEqual({
      type: "open-url",
      title: "Open Apple Intelligence Settings",
      url: APPLE_SETTINGS_URL,
    });
    expect(fixTypes(s)).toEqual(expect.arrayContaining(["retry", "switch"]));
  });

  it("asks for the one-time `sudo fm license` when the terms aren't accepted (exit 69)", () => {
    const s = appleStatus({ fmInstalled: true, code: 69, output: NOT_AGREED });
    expect(s).toMatchObject({ ready: false, state: "license" });
    expect(s.ready === false && s.fixes).toContainEqual({
      type: "copy",
      title: "Copy Terminal Command",
      text: "sudo fm license",
    });
  });

  it("explains a turned-off Apple Intelligence and an ineligible Mac", () => {
    const off = appleStatus({
      fmInstalled: true,
      code: 1,
      output: "System model unavailable: appleIntelligenceNotEnabled",
    });
    expect(off).toMatchObject({ ready: false, state: "off" });
    expect(off.ready === false && off.title).toMatch(/off/i);
    const ineligible = appleStatus({
      fmInstalled: true,
      code: 1,
      output: "System model unavailable: deviceNotEligible",
    });
    expect(ineligible).toMatchObject({ ready: false, state: "unsupported" });
    expect(fixTypes(ineligible)).toEqual(["switch"]);
  });

  it("needs macOS 27 when fm isn't there", () => {
    const s = appleStatus({ fmInstalled: false, code: null, output: "" });
    expect(s).toMatchObject({ ready: false, state: "missing" });
    expect(s.ready === false && s.title).toMatch(/macOS 27/);
  });

  it("passes an unknown reason through rather than guessing", () => {
    const s = appleStatus({ fmInstalled: true, code: 1, output: "System model unavailable: somethingNew" });
    expect(s).toMatchObject({ ready: false, state: "unavailable" });
    expect(s.ready === false && s.message).toContain("somethingNew");
  });
});

describe("ollamaStatus", () => {
  const base = { url: "http://127.0.0.1:11434", installed: true, reachable: true, models: ["llama3.2:latest"] };

  it("is ready with the model it will use", () => {
    expect(ollamaStatus(base)).toMatchObject({ ready: true, detail: "llama3.2:latest" });
    expect(ollamaStatus({ ...base, wanted: "llama3.2" })).toMatchObject({ ready: true, detail: "llama3.2" });
  });

  it("tells you to start Ollama when it's installed but not running", () => {
    const s = ollamaStatus({ ...base, reachable: false, models: [] });
    expect(s).toMatchObject({ ready: false, state: "stopped" });
    expect(s.ready === false && s.fixes).toContainEqual({
      type: "copy",
      title: "Copy Terminal Command",
      text: "ollama serve",
    });
  });

  it("offers the download page when Ollama isn't installed", () => {
    const s = ollamaStatus({ ...base, installed: false, reachable: false, models: [] });
    expect(s).toMatchObject({ ready: false, state: "missing" });
    expect(fixTypes(s)).toContain("open-url");
  });

  it("doesn't claim a remote Ollama isn't installed", () => {
    const s = ollamaStatus({
      ...base,
      url: "http://gpu-box.local:11434",
      installed: false,
      reachable: false,
      models: [],
    });
    expect(s).toMatchObject({ ready: false, state: "stopped" });
    expect(s.ready === false && s.message).toContain("gpu-box.local");
  });

  it("asks for a model when none is installed", () => {
    const s = ollamaStatus({ ...base, models: [] });
    expect(s).toMatchObject({ ready: false, state: "no-models" });
    expect(s.ready === false && s.fixes).toContainEqual({
      type: "copy",
      title: "Copy Terminal Command",
      text: "ollama pull llama3.2",
    });
  });

  it("names the configured model when it isn't installed", () => {
    const s = ollamaStatus({ ...base, wanted: "qwen3:8b" });
    expect(s).toMatchObject({ ready: false, state: "model-missing" });
    expect(s.ready === false && s.fixes).toContainEqual({
      type: "copy",
      title: "Copy Terminal Command",
      text: "ollama pull qwen3:8b",
    });
    expect(fixTypes(s)).toContain("preferences");
  });
});

describe("raycastStatus", () => {
  it("is ready with Pro and explains Pro otherwise", () => {
    expect(raycastStatus(true)).toMatchObject({ ready: true });
    const s = raycastStatus(false);
    expect(s).toMatchObject({ ready: false, state: "no-pro" });
    expect(s.ready === false && s.title).toMatch(/Raycast Pro/);
  });
});

describe("automaticStatus", () => {
  const apple = appleStatus({ fmInstalled: true, code: 1, output: "System model unavailable: modelNotReady" });
  const ollama = ollamaStatus({
    url: "http://127.0.0.1:11434",
    installed: true,
    reachable: true,
    models: ["llama3.2:latest"],
  });
  const noPro = raycastStatus(false);

  it("uses the first ready engine: Raycast AI, then Apple, then Ollama", () => {
    expect(automaticStatus([noPro, apple, ollama])).toMatchObject({ ready: true, engine: "ollama" });
  });

  it("explains every engine when none is ready", () => {
    const stopped = ollamaStatus({ url: "http://127.0.0.1:11434", installed: true, reachable: false, models: [] });
    const s = automaticStatus([noPro, apple, stopped]);
    expect(s).toMatchObject({ ready: false, state: "none-ready", waiting: true });
    expect(s.ready === false && s.message).toMatch(/Raycast AI.*\n.*Apple Intelligence.*\n.*Ollama/s);
  });
});

describe("switchTarget", () => {
  it("suggests a ready engine other than the current one", () => {
    const apple = appleStatus({ fmInstalled: true, code: 1, output: "System model unavailable: modelNotReady" });
    const ollama = ollamaStatus({ url: "http://127.0.0.1:11434", installed: true, reachable: true, models: ["m"] });
    expect(switchTarget([raycastStatus(false), apple, ollama], "apple")).toBe("ollama");
    expect(switchTarget([raycastStatus(false), apple], "apple")).toBeUndefined();
  });
});
