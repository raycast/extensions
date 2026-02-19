export default async function (input: { input: string }) {
  return atob(input.input);
}
