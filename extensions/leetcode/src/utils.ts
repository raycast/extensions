import { getPreferenceValues, showToast, Toast } from '@raycast/api';
import type { HTMLElement as ParserHTMLElement } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Problem, ProblemStats } from './types';

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
      postprocess: ({ node, options: { codeFence } }) =>
        `${codeFence}\n${((node as ParserHTMLElement).textContent || '').trim()}\n${codeFence}`,
    },
  },
);

export function formatProblemMarkdown(problem?: Problem, date?: string) {
  if (!problem) {
    return '';
  }

  const { showProblemStats } = getPreferenceValues<Preferences>();

  const title = `# ${problem.questionFrontendId}. ${problem.title}`;
  const dateLine = date ? `**🗓️ Date**: ${date}` : '';
  const statsLine = showProblemStats
    ? `**🧠 Difficulty**: ${problem.difficulty} | **👍 Likes**: ${problem.likes} | **👎 Dislikes**: ${problem.dislikes}`
    : '';
  const header = [dateLine, statsLine].filter(Boolean).join(' | ');

  let content = 'The problem is paid only, currently preview is not supported.';
  if (problem.isPaidOnly) {
    showToast(Toast.Style.Failure, content);
  } else {
    content = html2markdown.translate(problem.content);
  }

  let footer = '';
  if (showProblemStats) {
    const stats: ProblemStats = JSON.parse(problem.stats);
    footer = `\n> **Accepted** ${stats.totalAccepted} | **Submissions** ${stats.totalSubmission} | **Accepted Rate** ${stats.acRate}\n`;
  }

  return `${title}\n\n${header}\n\n${content}\n${footer}`;
}
