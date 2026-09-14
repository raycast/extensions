import { getCapture, getConnectPrompt } from "../lib/tuple";

type Input = {
  /** The call ID returned by list-recent-calls or search-capture. */
  callId: string;
};

/** Read the complete Capture with the CLI's version-matched participation guide. */
export default async function (input: Input) {
  const [instructions, records] = await Promise.all([getConnectPrompt(input.callId), getCapture(input.callId)]);
  return { instructions, records };
}
