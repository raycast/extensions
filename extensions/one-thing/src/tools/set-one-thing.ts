import { Cache, launchCommand, LaunchType } from "@raycast/api";

type Input = {
  /**
   * The text to set as the one thing.
   */
  text: string;
};

export default async function setOneThing(input: Input) {
  try {
    await launchCommand({ name: "show-one-thing", type: LaunchType.Background });
  } catch (error) {
    throw new Error("Menu bar is not activated, please run the 'Show One Thing' command first.");
  }

  const cache = new Cache();
  cache.set("onething", input.text);

  return "One thing set";
}
