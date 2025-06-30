import { getLinkMarkdown } from "@/utils/content";

type Input = {
  markdownUrl: string;
};

export default async function getDocumentationLinkContent(input: Input) {
  const markdown = await getLinkMarkdown(input.markdownUrl);
  return markdown;
}
