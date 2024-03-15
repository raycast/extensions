import { Detail } from "@raycast/api";
import { typeColor, typeDescription } from "./utils";
import { Alias } from "./types";

export default function CommandDetail({ alias }: { alias: Alias }) {
  const markdown = `
# ${alias.name}
###
\`\`\`
${alias.command}
\`\`\`

## ${alias.description}
###
\`${alias.type}\` ${typeDescription(alias.type)}
`;
  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="">
            <Detail.Metadata.TagList.Item text={alias.name} color={typeColor(alias.type)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text={alias.type} color={typeColor(alias.type)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Reference"
            target="https://github.com/ohmyzsh/ohmyzsh/blob/master/plugins/git/README.md"
            text="Ohmyzsh Plugin Readme"
          />
        </Detail.Metadata>
      }
    />
  );
}
