import { resolve } from "../data";
import { openSmallWindow } from "../yab";

type Input = {
  /** An address or words to open. */
  query: string;
};

/** Open something in Yab's Small Window, a floating window for a quick look, like Little Arc. */
export default async function tool(input: Input) {
  await openSmallWindow(await resolve(input.query));
  return "Opened";
}
