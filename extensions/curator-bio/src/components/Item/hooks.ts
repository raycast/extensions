import url from "url";
import { useMemo } from "react";
import { EmbedData, BlocksItem, LinkData, Item, ImageData, HeaderData } from "../../lib/types";

const getYouTubeVideoId = (data: EmbedData) => {
  if (data.source) {
    return new url.URL(data.source).searchParams.get("v");
  } else {
    return data.embed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/)?.[1];
  }
};

export const renderEmbedData = (data: EmbedData) => {
  const { service, source } = data;

  switch (service) {
    case "youtube": {
      const videoId = getYouTubeVideoId(data);

      if (!videoId) {
        return "";
      }

      return `![${videoId}](https://img.youtube.com/vi/${videoId}/hqdefault.jpg)
      
[Watch on YouTube](${source})`;
    }
    default: {
      return `![${service}](${source})`;
    }
  }
};

export const blocksToMarkdownRenderer = (blocks: BlocksItem[] = []): string => {
  return blocks
    .map((block) => {
      const data = block.data;
      switch (block.type) {
        case "linkTool": {
          const { meta: { image, title: _title, description: _description } = {}, link } = data as LinkData;
          const description =
            _description && (_description.length > 150 ? _description.slice(0, 150) + "..." : _description);
          const title = _title && (_title.length > 100 ? _title.slice(0, 100) + "..." : _title);

          return `#### [${title}](${link})

> ${description}
${image?.url && `\n![${_title}](${image?.url})`}
          `;
        }

        case "image": {
          const {
            file: { url },
            caption,
          } = data as ImageData;

          return `![${caption}](${url})`;
        }

        case "embed": {
          return renderEmbedData(data as EmbedData);
        }

        case "paragraph": {
          return `\n${block.data.text}\n`;
        }

        case "header": {
          const { text, level } = block.data as HeaderData;
          return `${"#".repeat(level)} ${text}`;
        }

        case "delimiter": {
          return "\n---\n";
        }

        default:
          console.warn(`Unknown block type: ${block.type}`);
          console.warn(JSON.stringify(block, null, 2));
          return "";
      }
    })
    .join("\n");
};

export const useItemRenderData = (item: Item) => {
  const link = item.settings?.link?.value || null;

  const blocksMarkdown = useMemo(() => {
    return blocksToMarkdownRenderer(item.content.blocks);
  }, [item.content.blocks]);

  const markdown = useMemo(() => {
    return `## ${item.title}

### ${item.subtitle}

${blocksMarkdown}
`;
  }, [blocksMarkdown, item.subtitle, item.title]);

  return { link, markdown };
};
