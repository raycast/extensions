export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof (error) === "string") {
        return error;
    } else {
        return "unknown error";
    }
}

const fmt = new Intl.NumberFormat('en', { notation: 'compact' });

export function compactNumberFormat(num: number): string {
    return fmt.format(num)
}
