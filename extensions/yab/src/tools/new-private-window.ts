import { resolve } from "../data";
import { newPrivateWindow } from "../yab";

type Input = {
  /** An address or words to open in it. */
  query?: string;
};

/** Open a private Yab window: nothing it visits is kept. */
export default async function tool(input: Input) {
  await newPrivateWindow(input.query ? await resolve(input.query) : undefined);
  return "Opened";
}
