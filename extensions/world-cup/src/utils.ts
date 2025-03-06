export function capitalizeFirstLetter(string: string | null | undefined) {
  if (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  return "";
}
