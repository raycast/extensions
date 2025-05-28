import { List, Image } from "@raycast/api";
import type { CursorRule, Section } from "../types";
import { getAvatarIcon } from "@raycast/utils";
import { processContent } from "../utils";

interface Props {
  cursorRule: CursorRule;
  section?: Section;
  popularOnly: boolean;
}

export const CursorRulePreview = ({ cursorRule, section, popularOnly }: Props) => {
  return (
    <List.Item.Detail
      markdown={`${processContent(cursorRule.content).substring(0, 200)}...`}
      metadata={
        <List.Item.Detail.Metadata>
          {section && <List.Item.Detail.Metadata.Label text={section.name} title={cursorRule.title} />}
          <List.Item.Detail.Metadata.Label
            title="Created by"
            text={cursorRule.author.name}
            icon={{
              source: cursorRule.author.avatar || getAvatarIcon(cursorRule.author.name),
              mask: Image.Mask.Circle,
            }}
          />
          {popularOnly && cursorRule.count !== null && (
            <List.Item.Detail.Metadata.Label
              title="Used by"
              text={cursorRule.count > 1 ? `${cursorRule.count} people` : `${cursorRule.count} person`}
            />
          )}
          {cursorRule.tags && cursorRule.tags.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Tags">
                {cursorRule.tags.slice(0, 3).map((tag) => (
                  <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </>
          )}
          {cursorRule.libs && cursorRule.libs.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Libraries">
              {cursorRule.libs.slice(0, 3).map((lib) => (
                <List.Item.Detail.Metadata.TagList.Item key={lib} text={lib} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};
