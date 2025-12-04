import { docsUrl, markdownUrl } from "@/utils/constants";
import { resolveRelativePath } from "@/utils/url";
import fetch from "node-fetch";

export async function getLinkMarkdown(url: string) {
  try {
    const res = await fetch(url);
    let resText = await res.text();

    resText = replaceRelativeImageLinks(resText, url);
    resText = replaceRelativeMarkdownLinks(resText, url);
    resText = replaceDetailsSummary(resText);
    resText = replaceLinks(resText);
    resText = replaceMarkedText(resText);
    resText = replaceHints(resText);
    resText = replaceTabs(resText);
    resText = replaceCodeTags(resText);
    resText = frontmatterToMarkdownTable(resText);
    resText = replaceTableFromJSDocComponent(resText);
    return resText;
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return `Error fetching content: ${errorMessage}`;
  }
}

function replaceRelativeImageLinks(content: string, currentDocUrl: string): string {
  return content.replace(/!\[(.*?)\]\(((\.\.\/)*)([^)]+)\)/g, (match, altText, dots, _, path) => {
    if (path.startsWith("http")) return match;
    const fullPath = dots ? dots + path : path;
    return `![${altText}](${resolveRelativePath(fullPath, currentDocUrl)})`;
  });
}

function replaceRelativeMarkdownLinks(content: string, currentDocUrl: string): string {
  return content.replace(/\[(.*?)\]\(((\.\.\/)*)([^)]+)\)/g, (match, altText, dots, _, path) => {
    // Skip image markdown links (which start with !)
    if (match.startsWith("!")) {
      return match;
    }

    if (path.startsWith("http")) return match;

    const fullPath = dots ? dots + path : path;
    let resolvedUrl = resolveRelativePath(fullPath, currentDocUrl);
    resolvedUrl = resolvedUrl.replace(markdownUrl, docsUrl).replace(".md", "");

    return `[${altText}](${resolvedUrl})`;
  });
}

function replaceDetailsSummary(content: string): string {
  let result = content.replaceAll(/<details>\s*<summary>(.*?)<\/summary>/g, "\n---\n**$1**\n");
  result = result.replaceAll(/<\/details>/g, "");
  return result;
}

function replaceLinks(content: string): string {
  let result = content.replaceAll(/<a href="(.*?)">(.*?)<\/a>/g, "[$2]($1)");
  result = result.replaceAll(/<a href="(.*?)" target="_blank">(.*?)<\/a>/g, "[$2]($1)");
  return result;
}

function replaceMarkedText(content: string): string {
  return content.replaceAll(/<mark style="color:red;">(.*?)<\/mark>/g, "$1");
}

function replaceHints(content: string): string {
  let result = content.replaceAll(/\{% hint .* %\}\s+/g, "> ");
  result = result.replaceAll("{% endhint %}", "");
  return result;
}

function replaceCodeTags(content: string): string {
  let result = content.replaceAll("<code>", "`");
  result = result.replaceAll("</code>", "`");
  return result;
}

function replaceTabs(content: string): string {
  let result = content.replaceAll(/\{% tabs %\}\s+/g, "");
  result = result.replaceAll(/\{% endtabs %\}\s+/g, "");
  result = result.replaceAll(/{% tab title="([^"]+)" %}/g, "$1");
  result = result.replaceAll(/\{% endtab %\}\s+/g, "");
  return result;
}

function frontmatterToMarkdownTable(text: string): string {
  const frontmatterMatch = text.match(/---\s*([\s\S]*?)\s*---/);
  if (!frontmatterMatch || !frontmatterMatch[1]) return text;

  const content = frontmatterMatch[1].trim();
  const frontmatterFull = frontmatterMatch[0];

  // Split into lines and parse each line as key-value pair
  const lines = content.split("\n");
  const pairs: [string, string][] = [];

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      pairs.push([key, value]);
    }
  }

  if (pairs.length === 0) return text;

  // Create markdown table with keys as headers (capitalized)
  const keys = pairs.map(([key]) => {
    return key.charAt(0).toUpperCase() + key.slice(1);
  });
  const headerRow = `| ${keys.join(" | ")} |`;
  const separatorRow = `| ${keys.map(() => "---").join(" | ")} |`;
  const valueRow = `| ${pairs.map(([, value]) => value).join(" | ")} |`;

  const markdownTable = `${headerRow}\n${separatorRow}\n${valueRow}\n\n`;

  // Replace the frontmatter with the markdown table
  return text.replace(frontmatterFull, markdownTable);
}

function replaceTableFromJSDocComponent(content: string): string {
  return content.replaceAll(
    /<.*TableFromJSDoc.*\/>/g,
    "⚠️ 🚨 **SPECIAL CONTENT NOTICE** 🚨 ⚠️\n> **Interactive Table:** This content contains a special table component that can only be viewed in the web documentation.\n> Please visit the online documentation to see the complete table.",
  );
}
