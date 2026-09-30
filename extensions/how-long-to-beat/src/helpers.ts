/**
 * Transform a word in a singular or plural form.
 *
 * @param total Total of elements.
 * @param value Word to transform.
 * @param suffix Suffix to add to the word.
 *
 * @returns The word in a singular or plural form.
 */
export function pluralize(total: number, value: string, suffix = "s"): string {
  if (total <= 1) {
    return value;
  }

  return `${value}${suffix}`;
}
