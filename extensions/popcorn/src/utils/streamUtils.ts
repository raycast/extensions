export function extractQualityFromTitle(title: string): string {
  const qualityMatch = title.match(/\b(2160p|1080p|720p|480p|HDRip|BRRip|WEBRip)\b/i);
  return qualityMatch ? qualityMatch[0] : "Unknown";
}

export function extractSizeFromTitle(title: string): string {
  const sizeMatch = title.match(/💾\s*([\d.]+\s*[KMGT]B)/i);
  return sizeMatch ? sizeMatch[1] : "Unknown";
}

export function extractSourceFromTitle(title: string): string {
  const sourceMatch = title.match(/⚙️\s*([^\n]+)$/);
  return sourceMatch ? sourceMatch[1] : "Unknown";
}
