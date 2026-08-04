import { describe, expect, it } from "vitest";

import { primaryDeepLink } from "./deep-link";
import type { Capture } from "./captures";

function fakeCapture(id: string): Capture {
    return {
        id,
        content: "",
        sidecar: {
            id,
            timestamp: "2026-01-01T00:00:00Z",
            width: 0,
            height: 0,
            deviceID: "",
            lastModified: "2026-01-01T00:00:00Z",
            schemaVersion: 1,
        },
        pngPath: "",
        thumbPath: "",
        timestampMs: 0,
    };
}

describe("primaryDeepLink", () => {
    it("returns the gallery search URL when there are zero results", () => {
        expect(primaryDeepLink("anything", [])).toBe("oh-shoot://search?q=anything");
    });

    it("returns the per-capture URL when there is exactly one result", () => {
        const cap = fakeCapture("ABCD-1234");
        expect(primaryDeepLink("ignored", [cap])).toBe("oh-shoot://capture/ABCD-1234");
    });

    it("returns the gallery search URL with the term URI-encoded when there are many results", () => {
        const results = [fakeCapture("a"), fakeCapture("b"), fakeCapture("c")];
        expect(primaryDeepLink("hello world", results)).toBe("oh-shoot://search?q=hello%20world");
        expect(primaryDeepLink("a & b", results)).toBe("oh-shoot://search?q=a%20%26%20b");
    });
});
