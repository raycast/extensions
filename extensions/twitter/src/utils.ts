export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "unknown error";
}

export const padStart = (str: string | number, length: number): string => {
    return String(str).padStart(length, " ");
};