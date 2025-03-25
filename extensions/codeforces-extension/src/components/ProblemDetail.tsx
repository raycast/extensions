import { Detail, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import * as cheerio from "cheerio";
import fetch from "node-fetch";
import { CODEFORCES_BASE } from "../constants";

interface ProblemDetailProps {
  contestId: number;
  index: string;
  problemName: string;
}

function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);

  $("img.tex-graphics").each((_, elem) => {
    const src = $(elem).attr("src");
    if (src) {
      const absoluteUrl = src.startsWith("http") ? src : `https://codeforces.com${src}`;

      const dimensions = "?raycast-width=500?raycast-height=500";

      $(elem).replaceWith(`\n\n![](${absoluteUrl}${dimensions})\n\n`);
    }
  });

  $("div.section-title").each((_, elem) => {
    const title = $(elem).text();
    $(elem).replaceWith(`\n\n## ${title}\n\n`);
  });

  $("span.tex-span").each((_, elem) => {
    $(elem).replaceWith(`\\(${$(elem).text()}\\)`);
  });

  $("span.tex-font-style-tt").each((_, elem) => {
    $(elem).replaceWith(`\`${$(elem).text()}\``);
  });

  $(".sample-test .input").each((_, inputDiv) => {
    let inputContent = "";

    // single pre wala format
    const preContent = $(inputDiv).find("pre").text().trim();

    // alag alag div wala format
    const exampleLines = $(inputDiv).find(".test-example-line");

    if (exampleLines.length > 0) {
      const lines: string[] = [];
      exampleLines.each((_, line) => {
        lines.push($(line).text().trim());
      });
      inputContent = lines.join("\n");
    } else {
      inputContent = preContent;
    }

    $(inputDiv).replaceWith(`\n### Input\n\`\`\`\n${inputContent}\n\`\`\`\n`);
  });

  $("pre").each((_, elem) => {
    $(elem).replaceWith(`\n\`\`\`\n${$(elem).text().trim()}\n\`\`\`\n`);
  });

  $("p").each((_, elem) => {
    $(elem).replaceWith(`\n\n${$(elem).text()}\n\n`);
  });

  $(".output .title").each((_, elem) => {
    $(elem).replaceWith("\n### Output\n");
  });

  const markdown = $.text()
    .replace(/\$\$\$(.*?)\$\$\$/g, (_, math) => `\\(${math}\\)`)
    .replace(/\$\$\$\$\$\$(.*?)\$\$\$\$\$\$/g, (_, math) => `$$${math}$$`)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return markdown;
}

export function ProblemDetail({ contestId, index, problemName }: ProblemDetailProps) {
  const [content, setContent] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProblemContent() {
      try {
        const response = await fetch(`${CODEFORCES_BASE}problemset/problem/${contestId}/${index}`);
        const html = await response.text();
        // console.log("raw:");
        // console.log(html);

        const $ = cheerio.load(html);

        const problemStatement = $(".problem-statement");

        const timeLimit = problemStatement.find(".time-limit").text().replace("time limit per test", "").trim();
        const memoryLimit = problemStatement.find(".memory-limit").text().replace("memory limit per test", "").trim();

        problemStatement.find(".header").remove();
        // problemStatement.find(".time-limit").remove();
        // problemStatement.find(".memory-limit").remove();
        problemStatement.find(".input-file").remove();
        problemStatement.find(".output-file").remove();

        const limitsSection = `> ⏱️ Time limit: ${timeLimit}\n>\n> 💾 Memory limit: ${memoryLimit}\n\n---\n\n`;

        const markdown = htmlToMarkdown(problemStatement.html() || "");

        const problemId = `${contestId}${index}`;

        setContent(`# ${problemId}. ${problemName}\n\n${limitsSection}${markdown}`);
      } catch (error) {
        setContent("Failed to load problem content. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProblemContent();
  }, [contestId, index]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://codeforces.com/problemset/problem/${contestId}/${index}`}
          />
        </ActionPanel>
      }
    />
  );
}
