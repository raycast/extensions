import { getPreferenceValues } from '@raycast/api';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Problem, ProblemStats, SearchProblemResponse } from './types';
import { UNRATED_LABEL } from './ratings';

const html2markdown = new NodeHtmlMarkdown(
  {
    textReplace: [
      [/\\\[/g, '['],
      [/\\\]/g, ']'],
    ],
  },
  {
    pre: {
      spaceIfRepeatingChar: true,
      postprocess: ({ content, options: { codeFence } }) => `${codeFence}\n${content.trim()}\n${codeFence}`,
    },
  },
);

// LeetCode answers rejected list arguments with HTTP 200 and a null list, so
// surface that as an error instead of reading it as "no problems".
export function questionListOrThrow(result: SearchProblemResponse) {
  const list = result.data?.problemsetQuestionList;
  if (!list) {
    throw new Error(result.errors?.[0]?.message ?? 'LeetCode returned no problem list');
  }
  return list;
}

// The description as markdown, or a notice for premium problems, whose content
// isn't served. (No toast here: this runs during render and would repeat.)
export function problemContentMarkdown(problem: Problem): string {
  return problem.isPaidOnly
    ? 'The problem is paid only, currently preview is not supported.'
    : html2markdown.translate(problem.content);
}

export function formatProblemMarkdown(problem?: Problem, date?: string, rating?: number, ratingsLoaded = false) {
  if (!problem) {
    return '';
  }

  const { showProblemStats, showProblemRatings, showTopicTags } = getPreferenceValues<Preferences>();

  const title = `# ${problem.questionFrontendId}. ${problem.title}`;
  const dateHeader = date ? `**🗓️ Date**: ${date} ` : '';
  const statsHeader = showProblemStats
    ? `**🧠 Difficulty**: ${problem.difficulty} | **👍 Likes**: ${problem.likes} | **👎 Dislikes**: ${problem.dislikes}`
    : '';
  // Hidden until the ratings file has loaded, so no "Unrated" flashes mid-fetch.
  const ratingHeader = showProblemRatings && ratingsLoaded ? ` | **📈 Rating**: ${rating ?? UNRATED_LABEL}` : '';
  const header = `${dateHeader}${statsHeader}${ratingHeader}\n`;
  const topics =
    showTopicTags && problem.topicTags?.length
      ? `\n**🏷️ Topics**: ${problem.topicTags.map((tag) => tag.name).join(', ')}\n`
      : '';

  const content = problemContentMarkdown(problem);

  let footer = '';
  if (showProblemStats) {
    const stats: ProblemStats = JSON.parse(problem.stats);
    footer = `
> **Accepted** ${stats.totalAccepted} | **Submissions** ${stats.totalSubmission} | **Accepted Rate** ${stats.acRate}
`;
  }

  return `${title}\n\n${header}${topics}\n${content}\n${footer}`;
}
