import { getStories } from "../hackernews";
import { Topic } from "../types";

type Input = {
  /** The topic to get the stories for */
  topic: Topic;
};

export default async function (input: Input) {
  const stories = await getStories(input.topic);

  return stories;
}
