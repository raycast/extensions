import { encode } from "js-base64";

export default function (input: { input: string }) {
  return encode(input.input);
}
