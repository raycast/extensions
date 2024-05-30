export const asDollarAmt = (value: string | number, precision: number) => `$${Number(value).toFixed(precision)}`;

export const asPercentage = (value: string | number, precision: number) => `${(Number(value) * 100).toFixed(precision)} %`;
