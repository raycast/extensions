import { appleMusic } from "./utils/scripts/currentlyPlaying";
import { searchByCurrentlyPlaying } from "./utils/helpers";

export default async () => {
  await searchByCurrentlyPlaying(appleMusic, "Apple Music");
};
