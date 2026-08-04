import { playContent } from "../lib/play-flow";

type Input = {
  /** Title of the show or movie, e.g. "Rick and Morty" */
  title: string;
  /** Streaming app to use if the user named one, e.g. "Netflix" */
  app?: string;
};

/**
 * Open a specific show or movie on the Apple TV. Resolves the title to a real
 * streaming deep link (via JustWatch) when the provider supports tvOS deep
 * linking; for Netflix and unresolved titles it types the title into the
 * Apple TV's universal Search so the user can pick the result on screen.
 * Use this whenever the user names a show or movie.
 */
export default async function (input: Input): Promise<string> {
  try {
    const result = await playContent(input.title, input.app);
    return result.message;
  } catch (error) {
    return `Failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
