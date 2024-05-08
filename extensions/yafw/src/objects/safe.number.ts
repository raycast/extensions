/**
 * Allows safely convert any string to a number.
 * If parsing failed then returns undefined.
 *
 * @example
 * - '' -> undefined
 * - 'hello' -> undefined
 * - '15' -> 15
 */
export class SafeNumber {
  constructor(private readonly value: string) {}

  toInt(): number | undefined {
    if (!this.value) {
      return undefined;
    }

    const parsed = parseInt(this.value, 10);

    if (Number.isNaN(parsed)) {
      return undefined;
    }

    return parsed;
  }
}
