const suffixes = ["", "'", "2"];

// 3x3 uses all six faces; 2x2 needs only three adjacent faces (opposite faces are redundant).
const FACES_3 = ["R", "L", "U", "D", "F", "B"];
const AXIS_3: Record<string, string> = { R: "x", L: "x", U: "y", D: "y", F: "z", B: "z" };
const FACES_2 = ["R", "U", "F"];
const AXIS_2: Record<string, string> = { R: "x", U: "y", F: "z" };

function build(faces: string[], axis: Record<string, string>, length: number): string {
  const moves: string[] = [];
  let prev = "";
  let prevPrev = "";

  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];

    if (face === prev) continue;
    if (axis[face] === axis[prev] && axis[face] === axis[prevPrev]) continue;

    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    moves.push(face + suffix);

    prevPrev = prev;
    prev = face;
  }

  return moves.join(" ");
}

export function makeScramble(length = 20): string {
  return build(FACES_3, AXIS_3, length);
}

export function make2x2Scramble(length = 9): string {
  return build(FACES_2, AXIS_2, length);
}
