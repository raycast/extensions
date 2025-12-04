export function capitalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/\.(\w)/g, ". $1") // e.g. "VENEZIA S.LUCIA" -> "VENEZIA S. LUCIA"
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
    .join(" ");
}
