import { describe, expect, it } from "vitest";

import {
  addressCardDataUri,
  buildAddressCardSvg,
  buildPhraseCardSvg,
  phraseCardDataUri,
} from "../src/phrase-card";
import { buildWalletResult } from "../src/wallet";

const WORDS =
  "test test test test test test test test test test test junk".split(" ");
const FIXED_MNEMONIC = WORDS.join(" ");

describe("phrase card", () => {
  it("never contains the words while hidden", () => {
    const svg = buildPhraseCardSvg(WORDS, false, "dark");
    for (const word of new Set(WORDS)) {
      expect(svg).not.toContain(word);
    }
    expect(svg).toContain('width="54" height="7"');
  });

  it("keeps the words out of the masked data URI", () => {
    const uri = phraseCardDataUri(WORDS, false, "dark");
    const decoded = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
    for (const word of new Set(WORDS)) {
      expect(decoded).not.toContain(word);
    }
  });

  it("renders every word with its index when revealed", () => {
    const svg = buildPhraseCardSvg(WORDS, true, "light");
    for (const word of new Set(WORDS)) {
      expect(svg).toContain(`>${word}<`);
    }
    expect(svg).toContain(">01<");
    expect(svg).toContain(">12<");
  });

  it("lays out 12 words in 3 rows and 24 words in 6 rows", () => {
    const twentyFour = buildPhraseCardSvg(
      Array.from({ length: 24 }, () => "abandon"),
      true,
      "dark",
    );
    expect(buildPhraseCardSvg(WORDS, true, "dark")).toContain(
      'viewBox="0 0 700 212"',
    );
    expect(twentyFour).toContain('viewBox="0 0 700 374"');
  });
});

describe("address card", () => {
  const chains = buildWalletResult(FIXED_MNEMONIC).chains;

  it("lists Bitcoin first", () => {
    const svg = buildAddressCardSvg(chains, "dark");
    expect(svg.indexOf(">Bitcoin<")).toBeLessThan(svg.indexOf(">Ethereum<"));
    expect(svg.indexOf(">Bitcoin<")).toBeLessThan(svg.indexOf(">Solana<"));
  });

  it("renders every chain ticker and address", () => {
    const svg = buildAddressCardSvg(chains, "dark");
    for (const ticker of ["ETH", "BTC", "SOL"]) {
      expect(svg).toContain(`>${ticker}<`);
    }
    expect(svg).toContain(chains.evm.address);
    expect(svg).toContain(chains.btc.address);
    expect(svg).toContain(chains.sol.address);
  });

  it("shows derivation paths", () => {
    const svg = buildAddressCardSvg(chains, "light");
    expect(svg).toContain(chains.evm.path);
    expect(svg).toContain(chains.btc.path);
    expect(svg).toContain(chains.sol.path);
  });

  it("encodes as a base64 data URI", () => {
    const uri = addressCardDataUri(chains, "dark");
    expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const decoded = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
    expect(decoded).toContain(chains.evm.address);
  });
});
