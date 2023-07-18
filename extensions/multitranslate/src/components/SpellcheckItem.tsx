import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { getDiffSvg } from '../logic/diff'

export function SpellcheckItem({ text, corrected }: { text: string; corrected: string }) {
  const { data: diffSvg } = usePromise(
    async (from: string, to?: string) => {
      if (!to)
        return
      return await getDiffSvg(from, to)
    },
    [text, corrected],
  )

  const padding = ''
  let markdown = `###### ${padding}Did you mean\n\n${padding}${corrected}`
  if (diffSvg)
    markdown += `\n\n###### ${padding}Diff ![](${diffSvg})`

  return (
    <List.Item
      key="spellcheck"
      id="spellcheck"
      icon={{
        value: Icon.QuestionMarkCircle,
        tooltip: 'Spellcheck',
      }}
      title={corrected}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy" content={corrected} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}
