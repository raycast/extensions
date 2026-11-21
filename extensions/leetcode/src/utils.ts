import { getPreferenceValues } from '@raycast/api';
import { NodeHtmlMarkdown, TranslatorConfig } from 'node-html-markdown';
import { Problem, ProblemStats, SearchProblemResponse } from './types';
import { UNRATED_LABEL } from './ratings';

// Markdown has no superscript or subscript, so write 10<sup>4</sup> as 10^4 and x<sub>i</sub> as x_i,
// parenthesize compound ones (2^(n - 1), not 2^n - 1), and leave ordinals (2<sup>nd</sup>) plain.
function scriptTranslator(mark: string): TranslatorConfig {
  return {
    postprocess: ({ content }) => {
      const body = content.trim();
      if (!body || /^(st|nd|rd|th)$/.test(body)) {
        return content;
      }
      const text = /^-?\w+$/.test(body) ? `${mark}${body}` : `${mark}(${body})`;
      return content.replace(body, () => text);
    },
  };
}

const scriptTranslators = { sup: scriptTranslator('^'), sub: scriptTranslator('_') };

const html2markdown = new NodeHtmlMarkdown(
  {
    textReplace: [
      [/\\\[/g, '['],
      [/\\\]/g, ']'],
    ],
  },
  {
    // A custom 'pre' replaces the library default rather than extending it, so restate noEscape and
    // preserveWhitespace. The code-block child translators drop the <strong> around LeetCode's
    // "Input:"/"Output:" labels, which would otherwise show as literal ** inside the fence.
    pre: ({ visitor }) => ({
      noEscape: true,
      preserveWhitespace: true,
      spaceIfRepeatingChar: true,
      childTranslators: visitor.instance.codeBlockTranslators,
      postprocess: ({ content, options: { codeFence } }) => `${codeFence}\n${content.trim()}\n${codeFence}`,
    }),
    // Only inline code reaches this, since 'pre' switches its children to the code-block translators.
    // Same as the library default, except children also use the code-block translators, so the
    // <strong> in <code>S<sub>2</sub> = "0<strong>1</strong>1"</code> doesn't leave ** in the code span.
    code: ({ visitor }) => ({
      noEscape: true,
      spaceIfRepeatingChar: true,
      childTranslators: visitor.instance.codeBlockTranslators,
      postprocess: ({ content }) => {
        const longestRun = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
        const delimiter = '`'.repeat(longestRun + 1);
        const padding = longestRun ? ' ' : '';
        return `${delimiter}${padding}${content}${padding}${delimiter}`;
      },
    }),
    ...scriptTranslators,
  },
  scriptTranslators,
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
