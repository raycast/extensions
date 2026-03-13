export const truthy = Boolean as unknown as <T>(value: T | undefined | null | false | 0 | "") => value is T;
