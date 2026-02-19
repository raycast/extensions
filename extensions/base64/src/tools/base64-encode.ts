export default function (input: { input: string }) {
  return btoa(input.input);
}
