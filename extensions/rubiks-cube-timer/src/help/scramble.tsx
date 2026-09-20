const faces: string[] = ["R", "L", "U", "D", "F", "B"] as const;
const suffixes: string[] = ["", "'", "2"] as const;

const axis: Record<string, string> = {
  R: "X",
  L: "x",
  U: "y",
  D: "y",
  F: "z",
  B: "z",
};

export function makeScramble(length = 20): string {
  const moves: string[] = [];
  let prev = "";
  let prevPrev = "";

  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];

    if (face == prev) continue;
    if (axis[face] === axis[prev] && axis[face] === axis[prevPrev]) continue;

    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    moves.push(face + suffix);

    prevPrev = prev;
    prev = face;
  }

  return moves.join(" ");
}
