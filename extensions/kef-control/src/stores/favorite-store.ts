const favorites = new Set<number>();

const listeners = new Set<() => void>();

let cachedSnapshot: number[] = [];

export const favoriteStore = {
  initialize(initialValues: number[]) {
    favorites.clear();
    initialValues.forEach((value) => favorites.add(value));
    cachedSnapshot = Array.from(favorites).sort((a, b) => a - b);

    emit();
  },
  addFavorite(value: number) {
    favorites.add(value);
    cachedSnapshot = Array.from(favorites).sort((a, b) => a - b);
    emit();
  },
  removeFavorite(value: number) {
    favorites.delete(value);
    cachedSnapshot = Array.from(favorites).sort((a, b) => a - b);
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return cachedSnapshot;
  },
};

const emit = () => listeners.forEach((listener) => listener());
