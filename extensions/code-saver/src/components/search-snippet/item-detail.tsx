import { List } from "@raycast/api";
import { Snippet } from "../../lib/types/dto";
import { dateFormat } from "../../lib/utils/snippet-utils";
import { FILE_NAME_EXT_TO_LANG } from "../../lib/constants/programming-language";
import { getAvatarIcon } from "@raycast/utils";

export function ItemDetail({ snippet }: { snippet: Snippet }) {
  const createdAt = dateFormat(snippet.createAt);
  const lastUpdatedAt = dateFormat(snippet.updateAt);

  const codeBlockAnnotation = (function (fileName, formatType) {
    if (formatType == "tldr") {
      // tldr will be treated as markdown
      return null;
    }
    const extName = fileName.split(".").pop();
    if (extName === undefined) {
      return null;
    }
    if (extName in FILE_NAME_EXT_TO_LANG) {
      const key = extName as keyof typeof FILE_NAME_EXT_TO_LANG;
      const lang = FILE_NAME_EXT_TO_LANG[key].slice(-1)[0];
      return lang;
    }
    return null;
  })(snippet.fileName, snippet.formatType);

  const markdown =
    codeBlockAnnotation != null && codeBlockAnnotation != undefined
      ? `\`\`\`${codeBlockAnnotation}
${snippet.content}
\`\`\``
      : snippet.content;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={snippet.title} />
          <List.Item.Detail.Metadata.Label title="Filename" text={snippet.fileName} />
          <List.Item.Detail.Metadata.Label title="Created At" text={`${createdAt}`} />
          <List.Item.Detail.Metadata.Label title="Last Updated At" text={`${lastUpdatedAt}`} />
          <List.Item.Detail.Metadata.Label
            title="Library"
            icon={getAvatarIcon(snippet.library.name)}
            text={snippet.library.name}
          />
          {snippet.labels.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Labels">
              {snippet.labels.map((label) => (
                <List.Item.Detail.Metadata.TagList.Item key={label.uuid} text={label.title} color={label.colorHex} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
