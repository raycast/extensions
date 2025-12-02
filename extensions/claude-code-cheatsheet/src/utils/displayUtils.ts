export function truncateText(text: string, maxLength: number, suffix: string = "..."): string {
  if (text.length <= maxLength) return text;

  if (maxLength > suffix.length) {
    return text.substring(0, maxLength - suffix.length) + suffix;
  } else if (maxLength > 0) {
    return suffix;
  } else {
    return "";
  }
}

export function formatDisplayTitle(
  name: string,
  isDeprecated: boolean = false,
  deprecatedPrefix: string = "[DEPRECATED]"
): string {
  return isDeprecated ? `${deprecatedPrefix} ${name}` : name;
}

export function formatDisplaySubtitle(
  description: string,
  isDeprecated: boolean = false,
  alternative?: string,
  maxLength: number = 70,
  titleLength: number = 0
): string {
  const subtitle = isDeprecated && alternative ? `${description} (Use: ${alternative})` : description;

  const availableLength = maxLength - titleLength;
  return truncateText(subtitle, availableLength);
}

export function calculateDisplayText(
  title: string,
  subtitle: string,
  maxCombinedLength: number = 70
): { displayTitle: string; displaySubtitle: string } {
  const availableForSubtitle = maxCombinedLength - title.length;

  return {
    displayTitle: title,
    displaySubtitle: truncateText(subtitle, availableForSubtitle),
  };
}
