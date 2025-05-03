export default function validateTag(value: string): boolean {
  return value.indexOf(" ") >= 0;
}
