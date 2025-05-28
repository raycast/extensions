import { LaunchProps } from "@raycast/api";
import { searchByTrackAndArtist } from "./utils/helpers";
import { SearchArguments } from "./utils/types";

export default async (props: LaunchProps<{ arguments: SearchArguments }>) => {
  const { song, artists } = props.arguments;
  console.log(`song: ${song}, artists: ${artists}`);
  await searchByTrackAndArtist(song, artists);
};
