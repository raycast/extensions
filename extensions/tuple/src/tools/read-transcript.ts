import { getTranscript } from "../lib/tuple";

type Input = {
  /** The call's ID, as returned by list-recent-calls or search-transcripts. */
  callId: string;
};

/** Read the full speaker-attributed transcript of one recorded call. */
export default async function (input: Input) {
  return getTranscript(input.callId);
}
