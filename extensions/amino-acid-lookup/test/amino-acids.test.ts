// Run with: npm test   (uses Node's built-in test runner; no extra packages)
import { test } from "node:test";
import assert from "node:assert/strict";
import { findResidues, oneToThree, peptideMass, threeToOne } from "../src/lib/amino-acids.ts";
import { residueHex } from "../src/lib/color-schemes.ts";

const topMatch = (q: string) => findResidues(q)[0]?.aa.name;

test("finds a residue from any notation", () => {
  assert.equal(topMatch("Trp"), "Tryptophan");
  assert.equal(topMatch("w"), "Tryptophan");
  assert.equal(topMatch("TRYPTOPHAN"), "Tryptophan");
  assert.equal(topMatch("aspartate"), "Aspartic acid");
});

test("remembers which notation was typed", () => {
  assert.equal(findResidues("W")[0].typed, "oneLetter");
  assert.equal(findResidues("trp")[0].typed, "threeLetter");
  assert.equal(findResidues("tryptophan")[0].typed, "name");
});

test("partial names list standard residues before ambiguity codes", () => {
  const names = findResidues("glut").map((m) => m.aa.threeLetter);
  assert.deepEqual(names, ["Gln", "Glu", "Glx"]);
});

test("empty or unknown queries find nothing", () => {
  assert.deepEqual(findResidues(""), []);
  assert.deepEqual(findResidues("xyz"), []);
});

test("converts three-letter sequences in any common format", () => {
  for (const q of ["Met-Lys-Thr", "Met Lys Thr", "MetLysThr", "met-lys-thr"]) {
    assert.equal(threeToOne(q)?.output, "MKT", q);
  }
  assert.equal(threeToOne("Met-Lys-Ter")?.output, "MK*");
  assert.equal(threeToOne("Met-Foo"), undefined);
});

test("converts one-letter sequences", () => {
  assert.equal(oneToThree("MKTAYIAK")?.output, "Met-Lys-Thr-Ala-Tyr-Ile-Ala-Lys");
  assert.equal(oneToThree("mkt")?.output, "Met-Lys-Thr");
  assert.equal(oneToThree("M"), undefined, "single letters are residues, not sequences");
});

test("peptide mass subtracts one water per peptide bond", () => {
  const residues = oneToThree("MKTAYIAK")!.residues;
  assert.equal(peptideMass(residues)?.toFixed(2), "925.11");
  assert.equal(peptideMass(threeToOne("Met-Ter")!.residues), undefined, "stop has no mass");
});

test("colour schemes cover the 20 standard amino acids", () => {
  for (const r of "ACDEFGHIKLMNPQRSTVWY") {
    assert.match(residueHex("taylor", r) ?? "", /^#[0-9a-f]{6}$/, `taylor ${r}`);
    assert.match(residueHex("clustalx", r) ?? "", /^#[0-9a-f]{6}$/, `clustalx ${r}`);
  }
  assert.equal(residueHex("taylor", "C"), "#ffff00");
  assert.equal(residueHex("clustalx", "K"), "#f01505");
  assert.equal(residueHex("taylor", "X"), undefined);
});
