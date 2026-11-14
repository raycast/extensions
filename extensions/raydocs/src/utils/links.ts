import { Link } from "@/types";
import { docsUrl, linksUrl, markdownUrl } from "@/utils/constants";

const HEADING = /^#{1,6}\s+(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const LIST_LINK = /^\s*[-*+]\s+\[([^\]]*)\]\(([^)]+)\)/;

export async function getLinks(): Promise<Link[]> {
  const res = await fetch(linksUrl);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${linksUrl} (${res.status} ${res.statusText})`);
  }

  const markdown = await res.text();

  const links: Link[] = [];
  let sectionTitle: string | undefined;

  for (const line of markdown.split("\n")) {
    if (RULE.test(line)) {
      sectionTitle = undefined;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      sectionTitle = heading[1].trim();
      continue;
    }

    const link = line.match(LIST_LINK);
    if (link) {
      links.push({
        id: link[2],
        sectionTitle,
        title: link[1],
        url: parseUrl(link[2]),
      });
    }
  }

  return links;
}

function parseUrl(url: string | undefined): Link["url"] {
  if (!url) {
    return {
      path: docsUrl,
      markdown: markdownUrl,
      external: false,
    };
  } else if (url === "README.md") {
    return {
      path: docsUrl,
      markdown: `${markdownUrl}/${url}`,
      external: false,
    };
  } else if (url.startsWith("http")) {
    return {
      path: url,
      markdown: url,
      external: true,
    };
  } else if (url.endsWith("README.md")) {
    return {
      path: `${docsUrl}/${url.replace("/README.md", "")}`,
      markdown: `${markdownUrl}/${url}`,
      external: false,
    };
  } else {
    return {
      path: `${docsUrl}/${url.replace(".md", "")}`,
      markdown: `${markdownUrl}/${url}`,
      external: false,
    };
  }
}
