// Amino acid colour schemes, keyed by one-letter code. Residues a scheme does not
// cover (U, O, B, Z, J, X, *) have no colour and are shown grey.

export type ColorSchemeName = "taylor" | "clustalx";

/**
 * Taylor (Taylor 1997, Protein Eng. 10:743), as used in Jalview.
 * Every amino acid has its own colour; similar amino acids get similar hues.
 */
// prettier-ignore
const TAYLOR: Record<string, string> = {
  A: "#ccff00", V: "#99ff00", I: "#66ff00", L: "#33ff00", M: "#00ff00",
  F: "#00ff66", Y: "#00ffcc", W: "#00ccff", H: "#0066ff", R: "#0000ff",
  K: "#6600ff", N: "#cc00ff", Q: "#ff00cc", E: "#ff0066", D: "#ff0000",
  S: "#ff3300", T: "#ff6600", G: "#ff9900", P: "#ffcc00", C: "#ffff00",
};

/**
 * Clustal X, with Jalview's colours. Colours by group. In an alignment Clustal X only
 * colours a residue if its column is conserved enough; for a single residue we use
 * the base colour of its group.
 */
// prettier-ignore
const CLUSTALX: Record<string, string> = {
  A: "#80a0f0", I: "#80a0f0", L: "#80a0f0", M: "#80a0f0", F: "#80a0f0", W: "#80a0f0", V: "#80a0f0", // hydrophobic: blue
  K: "#f01505", R: "#f01505",                                                                       // positive: red
  D: "#c048c0", E: "#c048c0",                                                                       // negative: magenta
  N: "#15c015", Q: "#15c015", S: "#15c015", T: "#15c015",                                           // polar: green
  H: "#15a4a4", Y: "#15a4a4",                                                                       // aromatic: cyan
  C: "#f08080",                                                                                     // cysteine: pink
  G: "#f09048",                                                                                     // glycine: orange
  P: "#c0c000",                                                                                     // proline: yellow
};

const SCHEMES: Record<ColorSchemeName, Record<string, string>> = { taylor: TAYLOR, clustalx: CLUSTALX };

/** Hex colour of a residue in the given scheme, or undefined if the scheme does not cover it. */
export function residueHex(scheme: ColorSchemeName, oneLetter: string): string | undefined {
  return SCHEMES[scheme]?.[oneLetter];
}
