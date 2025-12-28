export function getProgressBar(percentage: number, width: number = 10): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  // Using blocks like the user showed: ▇ and ░?
  // User image: Year ▇▇▇▇▇▇▇▇▇▇▇▇░ 99%
  // Let's use █ and ░ or similar.
  // Raycast usually uses standard chars.
  // User's image has ▇ (U+2587) and ░ (U+2591) maybe?

  const fillChar = "▇";
  const emptyChar = "░";

  return `${fillChar.repeat(filled)}${emptyChar.repeat(empty)}`;
}
