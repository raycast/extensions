interface MessageWithDate {
  date: Date;
}

export function groupMessagesByDate<T extends MessageWithDate>(messages: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  messages.forEach((message) => {
    const date = message.date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;

    if (date.toDateString() === today.toDateString()) {
      dateKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = "Yesterday";
    } else {
      dateKey = date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  });

  return groups;
}

export function extractUrlFromText(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const trimmedText = text.trim();

  const urlRegex = /^(https?:\/\/[^\s]+)$/i;
  const match = trimmedText.match(urlRegex);

  if (match) {
    return match[1];
  }

  const urlPattern = /^(https?:\/\/[^\s]+)(\s.*)?$/i;
  const partialMatch = trimmedText.match(urlPattern);

  if (partialMatch && (!partialMatch[2] || partialMatch[2].trim().length < 10)) {
    return partialMatch[1];
  }

  return null;
}
