import { playContent } from "../lib/play-flow";

type Input = {
  /** Title of the show or movie, e.g. "Rick and Morty", a YouTube search, or "the latest <channel> video" */
  title: string;
  /** Streaming app to use if the user named one, e.g. "Netflix" or "YouTube" */
  app?: string;
};

/**
 * Open a show, movie, or YouTube video on the Apple TV. Shows and movies
 * resolve through JustWatch to a streaming deep link, or to Netflix's own
 * search; YouTube requests ("play lofi on YouTube", "the latest MKBHD video")
 * resolve to the video itself. Use this whenever the user names something to watch.
 */
export default async function (input: Input): Promise<string> {
  return playContent(input.title, input.app);
}
