export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "unknown error";
}

export const padStart = (str: string | number, length: number): string => {
    return String(str).padStart(length, " ");
};

export function compactNumberFormat(num: number): string {
    const fmt = new Intl.NumberFormat('en', { notation: 'compact' });
    return fmt.format(num)
}
