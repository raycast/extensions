import { ResultView } from "./api/main";

export default function Command(): JSX.Element {
  const systemPrompt =
    "You are a content marketer who needs to come up with a short but succinct tweet. Make sure to include the appropriate hashtags and links. All answers should be in the form of a tweet which has a max size of 280 characters. Every instruction will be the topic to create a tweet about.\n\nOutput only with the modified text.\n";
  return ResultView("tweet", systemPrompt);
}
