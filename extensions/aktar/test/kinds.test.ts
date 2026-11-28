import { describe, expect, it } from "vitest";
import {
  aKindName,
  canDeleteAfter,
  canMakeTemporaryLinks,
  destinationLabel,
  isUnsupportedByDestination,
  providerText,
  storageName,
} from "../src/lib/kinds";

const conflict = (message: string, status = 409) => Object.assign(new Error(message), { status });

describe("destination kinds", () => {
  it("only S3 (and kinds Aktar adds later) make temporary links and delete after a while", () => {
    for (const kind of ["s3", "ipfs"]) {
      expect(canMakeTemporaryLinks({ kind })).toBe(true);
      expect(canDeleteAfter({ kind })).toBe(true);
    }
    for (const kind of ["webdav", "sftp"]) {
      expect(canMakeTemporaryLinks({ kind })).toBe(false);
      expect(canDeleteAfter({ kind })).toBe(false);
    }
  });

  it("names the kind next to the provider, once", () => {
    expect(providerText({ kind: "s3", providerName: "Cloudflare R2" })).toBe("Cloudflare R2 · S3");
    expect(providerText({ kind: "webdav", providerName: "WebDAV" })).toBe("WebDAV");
    expect(aKindName("webdav")).toBe("a WebDAV");
    expect(aKindName("sftp")).toBe("an SFTP");
  });

  it("leaves out the bucket WebDAV doesn't have", () => {
    expect(destinationLabel({ name: "Docs", bucket: "files" })).toBe("Docs (files)");
    expect(destinationLabel({ name: "Nextcloud", bucket: "" })).toBe("Nextcloud");
    expect(storageName({ name: "Nextcloud", bucket: "" })).toBe("Nextcloud");
  });

  it("tells a destination that can't do something from other 409s", () => {
    expect(isUnsupportedByDestination(conflict("This destination can't make temporary links."))).toBe(true);
    expect(
      isUnsupportedByDestination(
        conflict("This destination can't delete uploads after a while (its storage has no lifecycle rules)."),
      ),
    ).toBe(true);
    expect(isUnsupportedByDestination(conflict("The upload was cancelled in Aktar."))).toBe(false);
    expect(isUnsupportedByDestination(conflict("This destination can't make temporary links.", 502))).toBe(false);
  });
});
