import { Detail } from "@raycast/api";
import { Prompt } from "../types";
import { TAGS } from "../config";

export default function Command({ prompt }: { prompt: Prompt }) {
  return (
    <Detail
      markdown={prompt.content}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Tags">
            {prompt?.tags?.map?.((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} icon={TAGS.find((t) => t.value === tag)?.icon} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
