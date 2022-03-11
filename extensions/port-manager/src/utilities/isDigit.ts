export default function isDigit(character: string) {
  return !Number.isNaN(Number(character));
}
