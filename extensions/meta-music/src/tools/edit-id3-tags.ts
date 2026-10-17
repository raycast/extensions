import { Toast, Tool, showToast } from "@raycast/api";

import NodeID3 from "node-id3";

type Input = {
  /**
   * The path to the audio file
   * Make sure to use absolute path of file system (e.g. /Users/user/Music/Artist/Album/Track.mp3)
   */
  path: string;
  /**
   * The title of the audio file
   */
  title?: NodeID3.Tags["title"];
  /**
   * The artist of the audio file
   */
  artist?: NodeID3.Tags["artist"];
  /**
   * The album of the audio file
   */
  album?: NodeID3.Tags["album"];
  /**
   * The performer info of the audio file
   */
  performerInfo?: NodeID3.Tags["performerInfo"];
  /**
   * The composer of the audio file
   */
  composer?: NodeID3.Tags["composer"];
  /**
   * The genre of the audio file
   */
  genre?: NodeID3.Tags["genre"];
  /**
   * The year of the audio file
   */
  year?: NodeID3.Tags["year"];
  /**
   * The track number of the audio file (e.g. 1/12)
   */
  trackNumber?: NodeID3.Tags["trackNumber"];
  /**
   * The part of set of the audio file (e.g. 1/2)
   */
  partOfSet?: NodeID3.Tags["partOfSet"];
  /**
   * The comment of the audio file
   * The comment should be an object with the language and the text
   */
  comment?: NodeID3.Tags["comment"];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: Object.entries(input).map(([key, value]) => {
      console.log("key:", key);
      console.log("value:", value);
      if (key === "comment" && typeof value === "object" && "text" in value) {
        return { name: key, value: value.text };
      }
      return { name: key, value: value?.toString() };
    }),
    message: `Are you sure you want to update the ID3 tags of the selected audio file with the following fields?`,
  };
};

/**
 * This tool gets the selected Finder items and updates the ID3 tags of the selected audio file
 */
export default async function editId3Tags(input: Input) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating tags" });
  const { path, ...tags } = input;

  const success = NodeID3.update(tags, path);

  if (success) {
    toast.style = Toast.Style.Success;
    toast.title = "Successfully updated tags 🎉";
  }
}
