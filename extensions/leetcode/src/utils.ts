import { showToast, Toast } from '@raycast/api';
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
        `${codeFence}\n${(node.textContent || '').trim()}\n${codeFence}`,
    },
  },
);

export function formatProblemMarkdown(problem?: Problem, date?: string) {
  if (!problem) {
    return '';
  }

  const title = `# ${problem.questionFrontendId}. ${problem.title}`;
  const header = `${date ? `**🗓️ Date**: ${date} ` : ''}**🧠 Difficulty**: ${problem.difficulty} | **👍 Likes**: ${
    problem.likes
  } | **👎 Dislikes**: ${problem.dislikes}
`;
  let content = 'The problem is paid only, currently preview is not supported.';
  if (problem.isPaidOnly) {
    showToast(Toast.Style.Failure, content);
  } else {
    content = html2markdown.translate(problem.content);
  }
  const stats: ProblemStats = JSON.parse(problem.stats);
  const footer = `
> **Accepted** ${stats.totalAccepted} | **Submissions** ${stats.totalSubmission} | **Accepted Rate** ${stats.acRate}
`;
  return `${title}\n\n${header}\n${content}\n${footer}`;
}
