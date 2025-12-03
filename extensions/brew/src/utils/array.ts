/**
 * Array prototype extensions for the Brew extension.
 *
 * Adds utility methods to Array prototype for convenience.
 * These are used throughout the extension for working with search results.
 */

/// Array Extensions

declare global {
  interface Array<T> {
    /** Total length before truncation (for paginated results) */
    totalLength?: number;
    /** Get the first element of the array */
    first(): T | undefined;
    /** Get the last element of the array */
    last(): T | undefined;
    /** Check if the array was truncated (totalLength > length) */
    isTruncated(): boolean;
  }
}

if (!Array.prototype.first) {
  Array.prototype.first = function <T>(this: T[]): T | undefined {
    return this.length > 0 ? this[0] : undefined;
  };
}

if (!Array.prototype.last) {
  Array.prototype.last = function <T>(this: T[]): T | undefined {
    return this.length > 0 ? this[this.length - 1] : undefined;
  };
}

if (!Array.prototype.isTruncated) {
  Array.prototype.isTruncated = function <T>(this: T[]): boolean {
    if (this.totalLength) {
      return this.length < this.totalLength;
    }
    return false;
  };
}

/// String Extensions

declare global {
  interface StringConstructor {
    ellipsis: string;
  }
}

if (!String.ellipsis) {
  String.ellipsis = "…";
}

// Export empty object to make this a module
export {};
