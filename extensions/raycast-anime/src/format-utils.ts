export function formatCountSubtitle(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
