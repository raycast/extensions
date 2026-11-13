export function validateTemperature(value: string | undefined) {
  if (!value?.trim() || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 2) {
    return "Enter a number between 0 and 2";
  }
}
