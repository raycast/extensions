export function convert(colors: Record<string, string | Record<string, string>>): Record<string, string> {
  const tailwindColors: Record<string, string> = {};

  for (const colorKey in colors) {
    if (typeof colors[colorKey] === "string") {
      tailwindColors[colorKey] = colors[colorKey] as string;
    } else {
      for (const nestedKey in colors[colorKey] as Record<string, string>) {
        tailwindColors[`${colorKey}-${nestedKey}`] = (colors[colorKey] as Record<string, string>)[nestedKey];
      }
    }
  }

  return tailwindColors;
}
