export type Position = { distance: number; rotation: number };

export function describe({ distance, rotation }: Position) {
  if (distance === 0) return "Against the wall";
  const turn = rotation === 0 ? "straight" : `${Math.abs(rotation)} ${rotation < 0 ? "left" : "right"}`;
  return `Distance ${distance} · ${turn}`;
}

export type Direction = "extend" | "retract" | "left" | "right";

export const STEP = 10;

export function clamp({ distance, rotation }: Position): Position {
  const clampedDistance = Math.min(Math.max(distance, 0), 100);
  return { distance: clampedDistance, rotation: Math.min(Math.max(rotation, -clampedDistance), clampedDistance) || 0 };
}

export function nudge({ distance, rotation }: Position, direction: Direction): Position {
  switch (direction) {
    case "extend":
      return clamp({ distance: distance + STEP, rotation });
    case "retract":
      return clamp({ distance: distance - STEP, rotation });
    case "left":
      return clamp({ distance, rotation: rotation - STEP });
    case "right":
      return clamp({ distance, rotation: rotation + STEP });
  }
}

const TOLERANCE = 3;

export const isAt = (position: Position, target: Position) =>
  Math.abs(position.distance - target.distance) <= TOLERANCE &&
  Math.abs(position.rotation - target.rotation) <= TOLERANCE;
