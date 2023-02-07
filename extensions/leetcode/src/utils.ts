import { showToast, Toast } from '@raycast/api';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Problem, ProblemStats } from './types';

const html2markdown = new NodeHtmlMarkdown(
  {},
  {
    pre: {
      spaceIfRepeatingChar: true,
      postprocess: ({ node, options: { codeFence } }) => `${codeFence}${node.textContent}${codeFence}`,
    },
  },
);

export function formatProblemMarkdown(problem?: Problem, date?: string) {
  if (!problem) {
    return '';
  }
  if (problem.isPaidOnly) {
    showToast(Toast.Style.Failure, 'The problem is paid only, currently preview is not supported.');
    return '';
  }

  const title = `# ${problem.questionFrontendId}. ${problem.title}`;
  const header = `${date ? `**🗓️ Date**: ${date} ` : ' '}**🧠 Difficulty**: ${problem.difficulty} | **👍 Likes**: ${
    problem.likes
  } | **👎 Dislikes**: ${problem.dislikes}
	`;
  const content = html2markdown.translate(problem.content);
  const stats: ProblemStats = JSON.parse(problem.stats);
  const footer = `
> **Accepted** ${stats.totalAccepted} | **Submissions** ${stats.totalSubmission} | **Accepted Rate** ${stats.acRate}
	`;
  return `${title}\n${header}\n${content}\n${footer}`;
}
