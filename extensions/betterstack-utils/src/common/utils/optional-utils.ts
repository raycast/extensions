export type Optional<T> = T | undefined;

export const asOptional = <T>(value: T | undefined | null): Optional<T> => value ?? undefined;
