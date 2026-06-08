export function randomIntInclusive(min: number, max: number, random = Math.random): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error("Bounds must be whole numbers");
  }

  if (max < min) {
    throw new Error("Max must be greater than or equal to min");
  }

  return Math.floor(random() * (max - min + 1)) + min;
}

export function pickRandom<T>(items: readonly T[], random = Math.random): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }

  return items[randomIntInclusive(0, items.length - 1, random)];
}

export function shuffleList<T>(items: readonly T[], random = Math.random): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIntInclusive(0, index, random);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}
