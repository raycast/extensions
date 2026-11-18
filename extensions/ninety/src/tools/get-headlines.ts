import { getHeadlines } from "../api/ninety";
import { htmlToText } from "../lib/format";
import { NinetyUrls } from "../lib/urls";

type Input = {
  /** Team Id from get-teams. */
  teamId: string;
  /** true for Cascading Messages instead of Headlines. */
  cascadingMessages?: boolean;
  /** true to include Headlines already discussed in a Meeting. */
  includeDiscussed?: boolean;
};

export default async function tool({ teamId, cascadingMessages, includeDiscussed }: Input) {
  const headlines = await getHeadlines({ teamId, isCascadedMessage: cascadingMessages, includeDiscussed });
  return headlines.map((headline) => ({
    id: headline.id,
    title: headline.title,
    description: htmlToText(headline.description) || undefined,
    discussed: headline.completed,
    createdDate: headline.createdDate,
    ownerUserId: headline.userId,
    url: NinetyUrls.headline(headline),
  }));
}
