function getCharType(str: string): "lower" | "upper" | "other" {
  if (str.match(/[a-z0-9]/)) {
    return "lower";
  } else if (str.match(/[A-Z0-9]/)) {
    return "upper";
  } else {
    return "other";
  }
}

export function splitIntoWords(str: string): string[] {
  const words = [] as string[];
  let word = "";
  let lastCharType = "other";
  for (let i = 0; i < str.length; i++) {
    const currentCharType = getCharType(str[i]);
    if (
      currentCharType === lastCharType ||
      (lastCharType === "upper" && currentCharType === "lower") // Support `TitleCase`
    ) {
      word += str[i];
      lastCharType = currentCharType;
    } else {
      if (word.length > 0 && lastCharType !== "other") {
        words.push(word);
      }
      word = str[i];
      lastCharType = currentCharType;
    }
  }

  if (word.length > 0 && lastCharType !== "other") {
    words.push(word);
  }

  return words.map((word) => word.toLowerCase());
}

export function getTimeDifference(a: number, b: number): string {
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  const duration = end - start;

  const seconds = Math.floor(duration / 1000) % 60;
  const minutes = Math.floor(duration / (1000 * 60)) % 60;
  const hours = Math.floor(duration / (1000 * 60 * 60)) % 24;
  const days = Math.floor(duration / (1000 * 60 * 60 * 24));

  let result = "";

  if (days > 0) {
    result += `${days}d`;
  }
  if (hours > 0 || result !== "") {
    result += `${hours}h`;
  }
  if (minutes > 0 || result !== "") {
    result += `${minutes}m`;
  }
  if (seconds > 0 || result === "") {
    result += `${seconds}s`;
  }

  return result;
}
