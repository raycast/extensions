export function prettify(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch (error) {
    return "The JSON is invalid";
  }
}
