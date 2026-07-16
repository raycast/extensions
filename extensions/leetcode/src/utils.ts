import { getPreferenceValues, showToast, Toast } from '@raycast/api';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Problem, ProblemStats } from './types';
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

export function formatProblemMarkdown(problem?: Problem, date?: string, rating?: number, ratingsLoaded = false) {
  if (!problem) {
    return '';
  }

  const { showProblemStats, showProblemRatings } = getPreferenceValues<Preferences>();

  const title = `# ${problem.questionFrontendId}. ${problem.title}`;
  const dateHeader = date ? `**🗓️ Date**: ${date} ` : '';
  const statsHeader = showProblemStats
    ? `**🧠 Difficulty**: ${problem.difficulty} | **👍 Likes**: ${problem.likes} | **👎 Dislikes**: ${problem.dislikes}`
    : '';
  // Hidden until the ratings file has loaded, so no "Unrated" flashes mid-fetch.
  const ratingHeader = showProblemRatings && ratingsLoaded ? ` | **📈 Rating**: ${rating ?? UNRATED_LABEL}` : '';
  const header = `${dateHeader}${statsHeader}${ratingHeader}\n`;

  let content = 'The problem is paid only, currently preview is not supported.';
  if (problem.isPaidOnly) {
    showToast(Toast.Style.Failure, content);
  } else {
    content = html2markdown.translate(problem.content);
  }

  let footer = '';
  if (showProblemStats) {
    const stats: ProblemStats = JSON.parse(problem.stats);
    footer = `
> **Accepted** ${stats.totalAccepted} | **Submissions** ${stats.totalSubmission} | **Accepted Rate** ${stats.acRate}
`;
  }

  return `${title}\n\n${header}\n${content}\n${footer}`;
}
