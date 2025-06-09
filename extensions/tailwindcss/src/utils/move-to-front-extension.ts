declare global {
  interface Array<T> {
    moveFirstMatchToFront(predicate: (item: T) => boolean): T[];
  }
}

export function extendArray(): void {
  if (!Array.prototype.moveFirstMatchToFront) {
    Array.prototype.moveFirstMatchToFront = function <T>(this: T[], predicate: (item: T) => boolean): T[] {
      const index = this.findIndex(predicate);

      if (index <= 0) {
        return [...this];
      }

      return [this[index], ...this.slice(0, index), ...this.slice(index + 1)];
    };
  }
}
