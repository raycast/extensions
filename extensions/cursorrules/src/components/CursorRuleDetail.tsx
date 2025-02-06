import { Action, ActionPanel, Detail, Icon, Image } from "@raycast/api"
import { getAvatarIcon } from "@raycast/utils"
import type { CursorRule } from "../types"
import { isImageUrl, processContent } from "../utils"
import { ContributeAction } from "./actions/ContributeAction"
import { CopyRuleAction } from "./actions/CopyRuleAction"
import { ExportAndEditAction } from "./actions/ExportAndEditAction"
import { OpenPrefAction } from "./actions/OpenPrefAction"

interface Props {
   cursorRule: CursorRule
   popularOnly: boolean
}

export const CursorRuleDetail = ({ cursorRule, popularOnly }: Props) => {
   return (
      <Detail
         navigationTitle={cursorRule.title}
         markdown={processContent(cursorRule.content)}
         metadata={
            <Detail.Metadata>
               <Detail.Metadata.Label
                  title="Author"
                  text={cursorRule.author.name}
                  icon={{
                     source:
                        (isImageUrl(cursorRule.author.avatar) &&
                           cursorRule.author.avatar) ||
                        getAvatarIcon(cursorRule.author.name),
                     mask: Image.Mask.Circle,
                  }}
               />
               {cursorRule.author.url && (
                  <Detail.Metadata.Link
                     title="Author URL"
                     target={cursorRule.author.url}
                     text={cursorRule.author.url}
                  />
               )}
               {popularOnly && cursorRule.count && (
                  <Detail.Metadata.Label
                     title="Used by"
                     text={
                        cursorRule.count > 1
                           ? `${cursorRule.count} people`
                           : `${cursorRule.count} person`
                     }
                  />
               )}
               <Detail.Metadata.TagList title="Tags">
                  {cursorRule.tags.map((tag) => (
                     <Detail.Metadata.TagList.Item key={tag} text={tag} />
                  ))}
               </Detail.Metadata.TagList>
               {cursorRule.libs && cursorRule.libs.length > 0 && (
                  <Detail.Metadata.TagList title="Libraries">
                     {cursorRule.libs.map((lib) => (
                        <Detail.Metadata.TagList.Item key={lib} text={lib} />
                     ))}
                  </Detail.Metadata.TagList>
               )}
            </Detail.Metadata>
         }
         actions={
            <ActionPanel>
               <ActionPanel.Section title="Actions">
                  <CopyRuleAction cursorRule={cursorRule} />
                  <ExportAndEditAction cursorRule={cursorRule} />
                  {cursorRule.isLocal && <ContributeAction />}
                  {!cursorRule.isLocal && (
                     <Action.OpenInBrowser
                        // eslint-disable-next-line @raycast/prefer-title-case
                        title="Open in cursorrules"
                        icon={Icon.Link}
                        url={`https://cursorrul.es/${cursorRule.slug}`}
                     />
                  )}
                  {cursorRule.author.url && !cursorRule.isLocal && (
                     <Action.OpenInBrowser
                        title="Open Author URL"
                        icon={Icon.Person}
                        url={cursorRule.author.url}
                     />
                  )}
                  {!cursorRule.isLocal && (
                     <Action.CopyToClipboard
                        title="Share Cursor Rule"
                        icon={Icon.Hashtag}
                        content={`https://cursorrul.es/${cursorRule.slug}`}
                        shortcut={{ modifiers: ["cmd"], key: "y" }}
                     />
                  )}
               </ActionPanel.Section>
               <ActionPanel.Section title="Settings">
                  <OpenPrefAction />
               </ActionPanel.Section>
            </ActionPanel>
         }
      />
   )
}
