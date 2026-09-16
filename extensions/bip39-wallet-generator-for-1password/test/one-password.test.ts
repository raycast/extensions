import { describe, expect, it } from "vitest";

import { CliMissingError, resolveCliPath } from "../src/cli-path";
import { buildItemTemplate } from "../src/item-template";
import { buildWalletResult } from "../src/wallet";

const FIXED_MNEMONIC =
  "test test test test test test test test test test test junk";

describe("1Password template", () => {
  it("uses the CLI encoding for the Crypto Wallet template", () => {
    const result = buildWalletResult(FIXED_MNEMONIC);
    const template = buildItemTemplate(result, "My Wallet Seed v1");

    expect(template.category).toBe("CUSTOM");
    expect(template.category_id).toBe("115");
    expect(template.category).not.toBe("CRYPTO_WALLET");
  });

  it("stores the recovery phrase in a concealed field", () => {
    const result = buildWalletResult(FIXED_MNEMONIC);
    const template = buildItemTemplate(result, "My Wallet Seed v1");
    const recovery = template.fields.find(
      (field) => field.id === "recoveryPhrase",
    );
    expect(recovery).toMatchObject({
      type: "CONCEALED",
      value: FIXED_MNEMONIC,
    });
  });

  it("organizes wallet details into dedicated sections", () => {
    const result = buildWalletResult(FIXED_MNEMONIC);
    const template = buildItemTemplate(result, "My Wallet Seed v1");

    expect(template.sections.map((section) => section.label)).toEqual([
      "Recovery",
      "Public Addresses",
      "Derivation Details",
    ]);
    expect(
      template.fields.find((field) => field.id === "evmAddress"),
    ).toMatchObject({
      label: "EVM Address",
      value: result.chains.evm.address,
    });
  });

  it("does not include notes or an empty password field", () => {
    const result = buildWalletResult(FIXED_MNEMONIC);
    const template = buildItemTemplate(result, "My Wallet Seed v1");
    const fieldIds = template.fields.map((field) => field.id);

    expect(fieldIds).not.toContain("notesPlain");
    expect(fieldIds).not.toContain("password");
  });
});

describe("1Password CLI path", () => {
  it("rejects a configured relative path", () => {
    expect(() => resolveCliPath("bin/op", () => true)).toThrowError(
      new CliMissingError(
        "The custom 1Password CLI path must be an absolute path.",
      ),
    );
  });

  it("prefers an existing configured absolute path", () => {
    const existingPaths = new Set([
      "/Applications/1Password.app/Contents/MacOS/op",
    ]);

    expect(
      resolveCliPath(
        " /Applications/1Password.app/Contents/MacOS/op ",
        (path) => existingPaths.has(path),
      ),
    ).toBe("/Applications/1Password.app/Contents/MacOS/op");
  });

  it("falls back to a known installation path", () => {
    expect(
      resolveCliPath(undefined, (path) => path === "/usr/local/bin/op"),
    ).toBe("/usr/local/bin/op");
  });
});
