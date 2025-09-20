import { Icon, List } from "@raycast/api";
import { SnippetFile } from "../../lib/types/snippet-file";
import { Label } from "../../lib/types/label";
import { SnippetWithLibrary, labelColor, snippetCreatedAt, snippetCreatedBy } from "../../lib/utils/snippet-utils";

export function ItemDetail({
  snippet,
  file,
  labels,
}: {
  snippet: SnippetWithLibrary;
  file: SnippetFile;
  labels: Label[];
}) {
  const libraryName = snippet.libraryName === "personal" ? "Personal" : snippet.libraryName;
  const libraryIcon = snippet.libraryName === "personal" ? Icon.Person : Icon.Building;
  const createdBy = snippetCreatedBy(snippet);
  const createdAt = snippetCreatedAt(snippet);

  const markdown = file.filetype === "markdown" ? file.content : `\`\`\`\\\n${file.content}\n\`\`\``;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={snippet.title} />
          <List.Item.Detail.Metadata.Label title="Filename" text={file.filename} />
          <List.Item.Detail.Metadata.Label title="Created" text={`${createdBy} - ${createdAt}`} />
          <List.Item.Detail.Metadata.Label title="Library" text={libraryName} icon={libraryIcon} />
          {labels.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Labels">
              {labels.map((label) => (
                <List.Item.Detail.Metadata.TagList.Item key={label.guid} text={label.title} color={labelColor(label)} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
