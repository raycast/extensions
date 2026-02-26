export function isValidVolumeInput(value: string): boolean {
  const volume = Number(value);
  return !isNaN(volume) && volume >= 0 && volume <= 100;
}
