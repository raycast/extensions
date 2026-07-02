export function parseAlpha(alpha: string): number {
  return alpha.includes("%") ? parseFloat(alpha) / 100 : +alpha;
}

export function parseRgbChannel(channel: string): number {
  if (channel.endsWith("%")) {
    return Math.round((parseFloat(channel) / 100) * 255);
  }
  return parseInt(channel, 10);
}

export function checkHslMatch(value: string) {
  const hslMatch = value.match(
    /^hsla?\(\s*(?<h>\d{1,3})\s*(?:,\s*|\s+)(?<s>\d{1,3})%?\s*(?:,\s*|\s+)(?<l>\d{1,3})%?\s*(?:[,/]\s*(?<alpha>(?:\d+\.?\d*|\.?\d+)%?))?\s*\)$/i,
  );
  if (!hslMatch) {
    return null;
  }
  return hslMatch.groups;
}

export function checkRgbMatch(value: string) {
  const rgbMatch = value.match(
    /^rgba?\(\s*(?<r>\d{1,3}%?)\s*(?:,\s*|\s+)(?<g>\d{1,3}%?)\s*(?:,\s*|\s+)(?<b>\d{1,3}%?)\s*(?:[,/]\s*(?<alpha>(?:\d+\.?\d*|\.?\d+)%?))?\s*\)$/i,
  );
  if (!rgbMatch?.groups?.r || !rgbMatch.groups.g || !rgbMatch.groups.b) {
    return null;
  }
  return rgbMatch.groups;
}
