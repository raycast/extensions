import { load } from "js-yaml";
import { MANTINE_URL } from "../constants";

type Content = string;
type InputContent = string;
type Line = string;
type MetaIndex = number;

type FindMetaIndices = {
  (mem: MetaIndex[], item: Line, i: MetaIndex): MetaIndex[];
};

const findMetaIndices: FindMetaIndices = (mem, item, i) => {
  if (/^---/.test(item)) {
    mem.push(i);
  }

  return mem;
};

type ParseMeta = {
  ({ lines, metaIndices }: { lines: Line[]; metaIndices: MetaIndex[] }): Record<string, unknown> & {
    title: string;
  };
};

const parseMeta: ParseMeta = ({ lines, metaIndices }) => {
  if (metaIndices.length > 0) {
    const metadata = lines.slice(metaIndices[0] + 1, metaIndices[1]);
    return load(metadata.join("\n")) as ReturnType<ParseMeta>;
  }

  return {
    title: "untitled",
  };
};

type ParseContent = {
  ({ lines, metaIndices }: { lines: Line[]; metaIndices: MetaIndex[] }): Content;
};

const parseContent: ParseContent = ({ lines, metaIndices }) => {
  if (metaIndices.length > 0) {
    lines = lines.slice(metaIndices[1] + 1, lines.length);
  }

  return lines.join("\n");
};

export type Markdown = {
  metadata: ReturnType<typeof parseMeta>;
  content: ReturnType<typeof parseContent>;
};

type ParseMD = {
  (contents: InputContent): Markdown;
};

const extendInternalLinksToExternal = (content: string) => {
  const links = content.match(/\[([^[]+)\](\(.*\))/gm);
  let extendedContent = content;

  if (links !== null && links.length > 0) {
    links.forEach((link) => {
      const text = link.match(/\[(.*?)\]/); //get only the txt
      const url = link.match(/\((.*?)\)/); //get only the link

      if (text && url && !url[1].startsWith("http")) {
        const finalLink = ` [${text[1]}](${MANTINE_URL}${url[1]}) `;

        extendedContent = extendedContent.replaceAll(link, finalLink);
      }
    });
  }
  return extendedContent;
};

const markDemoComponentsAsUnavailable = (content: string) => {
  const demos = content.match(/<Demo(.*)\/>/gm);
  let markedDemos = content;

  if (demos !== null && demos.length > 0) {
    demos.forEach((demo) => {
      markedDemos = markedDemos.replaceAll(demo, "`Demo is unavailable`");
    });
  }
  return markedDemos;
};

export const parseMD: ParseMD = (contents) => {
  const lines = contents.split("\n");
  const metaIndices = lines.reduce(findMetaIndices, []);
  const metadata = parseMeta({ lines, metaIndices });
  const content = parseContent({ lines, metaIndices });
  const extendedContent = extendInternalLinksToExternal(content);
  const withMarkedDemos = markDemoComponentsAsUnavailable(extendedContent);

  return { metadata, content: withMarkedDemos };
};
