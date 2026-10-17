export function mergeNoteTags(selectedTags: string[], newTags: string) {
  return [...new Set([...selectedTags, ...newTags.split(/\s+/)].filter(Boolean))];
}
