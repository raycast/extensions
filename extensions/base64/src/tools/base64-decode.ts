import { decode } from "js-base64";

export default async function (input: { input: string }) {
  return decode(input.input);
}
