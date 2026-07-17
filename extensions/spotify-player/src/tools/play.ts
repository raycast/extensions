import { play } from "../api/play";
import { withSpotifyClient } from "../helpers/withSpotifyClient";
import { ItemType } from "./types";
import retry from "async-retry";

type Input = {
  /**
   * The ID to play.
   *
   * ID's look like this '3TVXtAsR1Inumwj472S9r4'.
   * Prefer personalized items that have an owner with ID "spotify" over others.
   */
  id: string;
  /**
   * The type of content to play.
   * */
  type: ItemType;
};

const tool = async (input: Input) => {
  await retry(
    async () => {
      await play({ id: input.id, type: input.type });
    },
    { retries: 3 },
  );
};

export default withSpotifyClient(tool);
