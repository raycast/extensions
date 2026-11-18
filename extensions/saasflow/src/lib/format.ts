export function formatCurrency(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(0)}`;
    }
}

export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}
