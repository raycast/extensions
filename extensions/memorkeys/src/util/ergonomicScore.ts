import { keyboardRows } from "./charLookup";

interface KeyPosition {
  row: string; // Keyboard row (number, top, home, bottom, spacebar)
  index: number; // Position in the row
}

// Define keyboard regions for each hand
const LEFT_HAND_KEYS = new Set(["q", "w", "e", "r", "t", "a", "s", "d", "f", "g", "z", "x", "c", "v", "b"]);
const RIGHT_HAND_KEYS = new Set(["y", "u", "i", "o", "p", "h", "j", "k", "l", "n", "m", "/"]);

// Define reachability zones for three-modifier combinations
const THREE_MOD_REACHABILITY = {
  easy: new Set(["c", "d", "f", "r", "v", "s", "x", "z", "e"]), // Very comfortable to reach
  medium: new Set(["g", "t", "b", "h", "3", "6", "7", "w", "4", "5"]), // Requires some stretch
  hard: new Set(["y", "j", "n", "2", "q", "a", "8"]), // Requires significant stretch
  veryHard: new Set([
    // Very difficult or unreachable
    "u",
    "i",
    "k",
    "m",
    "o",
    "p",
    "l",
    ",",
    ".",
    "/",
    ";",
    "'",
    "[",
    "]",
    "\\",
    "9",
    "0",
    "-",
    "=",
    "`",
    "1",
  ]),
};

// Define modifier combinations that can be pressed with thumb
const THUMB_FRIENDLY_COMBINATIONS = new Set(["command+option", "control+shift"]);

// Define modifier key locations and their ergonomic impact
const MODIFIER_LOCATIONS = {
  shift: {
    left: { side: "left", position: "bottom", score: -1 }, // Left shift next to Z
    right: { side: "right", position: "bottom", score: -1 }, // Right shift next to /
  },
  command: {
    left: { side: "left", position: "bottom", score: -0.5 }, // Left cmd (thumb)
    right: { side: "right", position: "bottom", score: -0.5 }, // Right cmd (thumb)
  },
  option: {
    left: { side: "left", position: "bottom", score: -0.5 }, // Left option (thumb)
    right: { side: "right", position: "bottom", score: -0.5 }, // Right option (thumb)
  },
  control: {
    left: { side: "left", position: "bottom", score: -1.5 }, // Left control (pinky)
    right: { side: "left", position: "bottom", score: -3 }, // No right control (extra penalty)
  },
};

// Define keys that are particularly difficult with control
const FAR_RIGHT_KEYS = new Set([
  ".",
  "l",
  "o",
  "9",
  "0",
  "p",
  ";",
  "/",
  "[",
  "-",
  "=",
  "]",
  "\\",
  "up",
  "down",
  "left",
  "right",
  "delete",
  "return",
]);

// Check if a modifier combination can be pressed with thumbs
const isThumbFriendlyCombination = (activeModifiers: string[]): boolean => {
  // Three or more thumb modifiers are never thumb-friendly
  const thumbModifiers = activeModifiers.filter((mod) => ["command", "option", "control"].includes(mod));
  if (thumbModifiers.length >= 3) {
    return false;
  }

  // Check against known thumb-friendly combinations
  for (const combo of THUMB_FRIENDLY_COMBINATIONS) {
    const requiredMods = combo.split("+");
    if (requiredMods.every((mod) => activeModifiers.includes(mod))) {
      return true;
    }
  }
  return false;
};

// Find a key's position on the keyboard
const findKeyPosition = (key: string): KeyPosition | null => {
  for (const [rowName, keys] of Object.entries(keyboardRows)) {
    const index = keys.findIndex((k) => k.key.toLowerCase() === key.toLowerCase());
    if (index !== -1) {
      return { row: rowName, index };
    }
  }
  return null;
};

// Calculate horizontal distance between two keys
const calculateHorizontalDistance = (pos1: KeyPosition, pos2: KeyPosition): number => {
  return Math.abs(pos1.index - pos2.index);
};

// Calculate vertical distance between keyboard rows
const getRowDistance = (row1: string, row2: string): number => {
  const rowOrder = ["number", "top", "home", "bottom", "spacebar"];
  const index1 = rowOrder.indexOf(row1);
  const index2 = rowOrder.indexOf(row2);
  return Math.abs(index1 - index2);
};

// Calculate ergonomic impact of modifier keys for one-handed use
const calculateModifierErgonomics = (keyName: string, modifier: string): number => {
  const normalizedKey = keyName.toLowerCase();
  const isLeftKey = LEFT_HAND_KEYS.has(normalizedKey);
  const isRightKey = RIGHT_HAND_KEYS.has(normalizedKey);

  const modifierLocation = MODIFIER_LOCATIONS[modifier as keyof typeof MODIFIER_LOCATIONS];

  // Spacebar is equally accessible from both sides
  if (normalizedKey === "space") {
    return Math.min(modifierLocation.left.score, modifierLocation.right.score);
  }

  // Special case for control key (no right control)
  if (modifier === "control") {
    if (isRightKey) {
      return -3; // Severe penalty for reaching across
    }
    return modifierLocation.left.score;
  }

  // For other modifiers, find the best score
  const leftScore = modifierLocation.left.score;
  const rightScore = modifierLocation.right.score;

  // Add small penalty for crossing hands
  if (isLeftKey) {
    return Math.max(leftScore, rightScore * 1.2);
  } else if (isRightKey) {
    return Math.max(rightScore, leftScore * 1.2);
  }

  return Math.max(leftScore, rightScore);
};

// Calculate reachability score for three-modifier combinations
const getThreeModReachabilityScore = (key: string): number => {
  const normalizedKey = key.toLowerCase();
  if (THREE_MOD_REACHABILITY.easy.has(normalizedKey)) return -0.5;
  if (THREE_MOD_REACHABILITY.medium.has(normalizedKey)) return -1.5;
  if (THREE_MOD_REACHABILITY.hard.has(normalizedKey)) return -2.5;
  if (THREE_MOD_REACHABILITY.veryHard.has(normalizedKey)) return -4;
  return -5; // Default for unreachable keys
};

// Result of ergonomic score calculation
interface ErgonomicScores {
  oneHandedScore: number; // Score for one-handed operation
  twoHandedScore: number; // Score for two-handed operation
  disruptionScore: number; // Score for workflow disruption
  details: {
    oneHanded: string[]; // Explanations for one-handed score
    twoHanded: string[]; // Explanations for two-handed score
    disruption: string[]; // Explanations for disruption score
  };
}

// Main function to calculate ergonomic scores for a shortcut
export const calculateErgonomicScore = (
  keyName: string,
  modifiers: {
    command: boolean;
    option: boolean;
    control: boolean;
    shift: boolean;
  },
): ErgonomicScores => {
  // Initialize scores at perfect (10)
  let oneHandedScore = 10;
  let twoHandedScore = 10;
  let disruptionScore = 10;

  const details = {
    oneHanded: [] as string[],
    twoHanded: [] as string[],
    disruption: [] as string[],
  };

  const keyPos = findKeyPosition(keyName);
  const homePos = findKeyPosition("f");
  const normalizedKey = keyName.toLowerCase();

  // Apply penalties for various ergonomic factors
  // 1. Control + far right keys
  if (modifiers.control && FAR_RIGHT_KEYS.has(normalizedKey)) {
    oneHandedScore -= 4;
    twoHandedScore -= 1;
    details.oneHanded.push("Control + far right key: -4 points (no right control key available)");
    details.twoHanded.push("Control + far right key: -1 point (requires left hand for control)");
    disruptionScore -= 2;
    details.disruption.push("Control + far right key: -2 points (awkward stretch required)");
  }

  // 2. Distance from home position
  if (keyPos && homePos) {
    const horizontalDistance = calculateHorizontalDistance(keyPos, homePos);
    const verticalDistance = getRowDistance(keyPos.row, homePos.row);

    const totalDisruption = horizontalDistance * 0.7 + verticalDistance * 1.2;
    const disruptionPenalty = -totalDisruption;
    disruptionScore += disruptionPenalty;

    if (totalDisruption > 1) {
      details.disruption.push(`Distance from home row: -${totalDisruption.toFixed(1)} points`);
    }
  }

  // Get active modifiers and analyze their impact
  const activeModifiers = Object.entries(modifiers)
    .filter(([, isActive]) => isActive)
    .map(([mod]) => mod);

  const thumbModifiers = activeModifiers.filter((mod) => ["command", "option", "control"].includes(mod));
  const hasThumbFriendlyCombo = isThumbFriendlyCombination(activeModifiers);

  // Analyze hand positions and stretching
  const isLeftHand = LEFT_HAND_KEYS.has(normalizedKey);
  const isRightHand = RIGHT_HAND_KEYS.has(normalizedKey);
  const isSpacebar = normalizedKey === "space";

  // Calculate base penalties for key position
  if (keyPos && homePos && !isSpacebar) {
    const horizontalDistance = calculateHorizontalDistance(keyPos, homePos);
    const verticalDistance = getRowDistance(keyPos.row, homePos.row);

    const oneHandedPenalty = -(horizontalDistance * 0.8 + verticalDistance * 1.2);
    oneHandedScore += oneHandedPenalty;
    if (oneHandedPenalty < -1.5) {
      details.oneHanded.push(`Key stretch: ${oneHandedPenalty.toFixed(1)} points`);
    }

    const twoHandedPenalty = -(horizontalDistance * 0.4 + verticalDistance * 0.8);
    twoHandedScore += twoHandedPenalty;
    if (twoHandedPenalty < -1.5) {
      details.twoHanded.push(`Key stretch: ${twoHandedPenalty.toFixed(1)} points`);
    }
  }

  // Calculate modifier key penalties
  let oneHandedModifierPenalty = 0;
  let twoHandedModifierPenalty = 0;

  // Bonus for thumb-friendly combinations
  if (hasThumbFriendlyCombo && thumbModifiers.length < 3) {
    oneHandedModifierPenalty += 1.5;
    twoHandedModifierPenalty += 1;
    details.oneHanded.push("Thumb-friendly modifier combination: +1.5 points");
    details.twoHanded.push("Thumb-friendly modifier combination: +1 point");

    oneHandedModifierPenalty -= 0.5;
    twoHandedModifierPenalty -= 0.25;
  }

  // Severe penalty for three or more thumb modifiers
  if (thumbModifiers.length >= 3) {
    oneHandedModifierPenalty -= 5;
    twoHandedModifierPenalty -= 3;
    details.oneHanded.push("Three or more thumb modifiers: -5 points (very difficult combination)");
    details.twoHanded.push("Three or more thumb modifiers: -3 points (difficult combination)");
  }

  // Calculate individual modifier penalties
  activeModifiers.forEach((modifier) => {
    if (!hasThumbFriendlyCombo || modifier === "shift" || thumbModifiers.length >= 3) {
      const oneHandedModScore = calculateModifierErgonomics(keyName, modifier);
      oneHandedModifierPenalty += oneHandedModScore;

      const twoHandedModScore = modifier === "control" ? -1 : -0.5;
      twoHandedModifierPenalty += twoHandedModScore;

      details.oneHanded.push(`${modifier} key: ${oneHandedModScore} points`);
      details.twoHanded.push(`${modifier} key: ${twoHandedModScore} points`);
    }
  });

  oneHandedScore += oneHandedModifierPenalty;
  twoHandedScore += twoHandedModifierPenalty;

  // Apply cross-keyboard penalty if needed
  const needsToCross =
    !isSpacebar &&
    ((isLeftHand &&
      !hasThumbFriendlyCombo &&
      activeModifiers.some(
        (mod) =>
          MODIFIER_LOCATIONS[mod as keyof typeof MODIFIER_LOCATIONS].left.score >
          MODIFIER_LOCATIONS[mod as keyof typeof MODIFIER_LOCATIONS].right.score,
      )) ||
      (isRightHand &&
        !hasThumbFriendlyCombo &&
        activeModifiers.some(
          (mod) =>
            MODIFIER_LOCATIONS[mod as keyof typeof MODIFIER_LOCATIONS].right.score >
            MODIFIER_LOCATIONS[mod as keyof typeof MODIFIER_LOCATIONS].left.score,
        )));

  if (needsToCross) {
    const crossPenalty = -1;
    oneHandedScore += crossPenalty;
    details.oneHanded.push(`Necessary keyboard crossing: ${crossPenalty} points`);
  }

  // Special handling for three-modifier combinations
  const hasAllThreeModifiers = modifiers.command && modifiers.option && modifiers.control;

  if (hasAllThreeModifiers) {
    const reachabilityScore = getThreeModReachabilityScore(keyName);

    if (RIGHT_HAND_KEYS.has(normalizedKey)) {
      // Right-hand keys are more natural with three modifiers
      oneHandedScore = 0;
      twoHandedScore = 7 + reachabilityScore;

      if (modifiers.shift) {
        twoHandedScore -= 2;
        details.twoHanded.push("Shift with three modifiers: -2 points");
      }

      details.twoHanded.push(`Key reachability with three modifiers: ${reachabilityScore} points`);
      details.oneHanded.push("Three modifiers with right-hand key: impossible one-handed");
    } else {
      // Left-hand keys with three modifiers are very difficult
      oneHandedScore = 2 + reachabilityScore;
      twoHandedScore = 5 + reachabilityScore;

      if (modifiers.shift) {
        oneHandedScore -= 3;
        twoHandedScore -= 2;
        details.oneHanded.push("Shift with three modifiers: -3 points");
        details.twoHanded.push("Shift with three modifiers: -2 points");
      }

      details.oneHanded.push(`Key reachability with three modifiers: ${reachabilityScore} points`);
      details.twoHanded.push(`Key reachability with three modifiers: ${reachabilityScore} points`);
    }

    // Adjust disruption score based on reachability
    disruptionScore = 8 + reachabilityScore;
    details.disruption.push(`Three modifier combination disruption: ${reachabilityScore} points`);
  }

  // Ensure scores stay within 0-10 range
  oneHandedScore = Math.max(0, Math.min(10, oneHandedScore));
  twoHandedScore = Math.max(0, Math.min(10, twoHandedScore));
  disruptionScore = Math.max(0, Math.min(10, disruptionScore));

  return {
    oneHandedScore: Number(oneHandedScore.toFixed(1)),
    twoHandedScore: Number(twoHandedScore.toFixed(1)),
    disruptionScore: Number(disruptionScore.toFixed(1)),
    details,
  };
};
