export const PRODUCTION_CONFIRMATION = "RUN PRODUCTION";

export function productionConfirmationMatches(value: string): boolean {
  return value === PRODUCTION_CONFIRMATION;
}
