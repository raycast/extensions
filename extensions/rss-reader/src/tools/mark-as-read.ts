import { LocalStorage } from "@raycast/api";

type Input = {
  /**
   * The GUID or unique identifier of the story to mark as read.
   */
  storyGuid: string;
};

/**
 * Mark an RSS story as read.
 * Updates the read status of a specific story.
 */
export default async function (input: Input) {
  const { storyGuid } = input;

  const storyLastReadString = await LocalStorage.getItem<string>("storyLastRead");
  const storyLastRead: Record<string, number> = JSON.parse(storyLastReadString ?? "{}");

  const lastRead = new Date().valueOf();
  storyLastRead[storyGuid] = lastRead;

  await LocalStorage.setItem("storyLastRead", JSON.stringify(storyLastRead));

  return {
    storyGuid,
    lastRead: new Date(lastRead).toISOString(),
  };
}
