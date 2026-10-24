// tests/cli-detection.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveCliPath } from "../src/lib/cli-detection";

let tmp: string;

beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "tasktick-")); });
afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

function makeExe(path: string) {
    writeFileSync(path, "#!/bin/sh\nexit 0");
    chmodSync(path, 0o755);
}

describe("resolveCliPath", () => {
    it("prefers preference path when executable exists", async () => {
        const p = join(tmp, "custom-tasktick");
        makeExe(p);
        const got = await resolveCliPath(p, false, []);
        expect(got).toBe(p);
    });

    it("falls back through candidate list", async () => {
        const p = join(tmp, "fallback-tasktick");
        makeExe(p);
        const got = await resolveCliPath(undefined, false, [join(tmp, "missing"), p]);
        expect(got).toBe(p);
    });

    it("returns null when nothing exists", async () => {
        const got = await resolveCliPath(undefined, false, [join(tmp, "nope")]);
        expect(got).toBeNull();
    });

    it("ignores non-executable files", async () => {
        const p = join(tmp, "not-exec");
        writeFileSync(p, "");
        const got = await resolveCliPath(p, false, []);
        expect(got).toBeNull();
    });
});
