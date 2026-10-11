export function createLidwoordMarkdown(word: string, result: string | undefined, error: boolean) {
  if (error) {
    return `# Search failed\n\nCould not find the article for **${word}**.`;
  }

  if (result === undefined) {
    return `# Searching ${word}...`;
  }

  return `# ${result}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: 'short',
  second: '2-digit',
  year: 'numeric',
});

export function formatDateTime(date: Date | string) {
  return dateTimeFormatter
    .formatToParts(new Date(date))
    .map((part) => (part.type === 'literal' && part.value.includes(',') ? ' ' : part.value))
    .join('');
}
