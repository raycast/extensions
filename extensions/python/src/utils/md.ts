import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfm } from "micromark-extension-gfm";

export function gfmToMd(md: string): string {
  const tree = fromMarkdown(md, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });

  console.log(tree);

  const out = toMarkdown(tree, { extensions: [gfmToMarkdown()] });

  console.log(out);

  return out;
}
