import type { ReactElement } from 'react'
import { Icon, List } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { getLanguageName } from '../data/languages'
import type { TranslateResult } from '../types'
import { translate } from '../logic/translator'

export function TranslateDetail({ item }: { item: TranslateResult }): ReactElement {
  const { data: translatedBack, isLoading } = usePromise(translate, [item.translated, item.to, item.from])

  let markdown = item.translated
  if (translatedBack) {
    if (translatedBack.translated !== item.original)
      markdown += `\n\n------\n\n${translatedBack.translated}`
  }

  const isTheSame = translatedBack && translatedBack.translated.trim().toLowerCase() === item.original.trim().toLowerCase()

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="From" text={`${getLanguageName(item.from)} [${item.from}]`} />
          <List.Item.Detail.Metadata.Label title="To" text={`${getLanguageName(item.to)} [${item.to}]`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Translate Back"
            text={isLoading ? 'Loading...' : isTheSame ? 'Same' : 'Different'}
            icon={isLoading ? Icon.CircleProgress : isTheSame ? Icon.Checkmark : Icon.Info}
          />
        </List.Item.Detail.Metadata>
      }
    />
  )
}
