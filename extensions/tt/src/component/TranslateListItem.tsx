import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  useNavigation,
} from '@raycast/api'
import { TranslateListItemData } from '../service/type'
import { FunctionComponent, useCallback } from 'react'
import { L } from '../constant'
import { FullText } from './FullText'

export const TranslateListItem: FunctionComponent<Props> = (props) => {
  const { source, item, onSave } = props
  const { push } = useNavigation()
  const onAction = useCallback(() => {
    if (item.text) {
      return push(<FullText source={source} item={item} />)
    }

    return showToast({
      style: Toast.Style.Failure,
      title: L.It_does_not_have_translated_text,
    })
  }, [item])

  return (
    <List.Item
      title={item.text || '...'}
      icon={item.icon}
      accessoryTitle={item.service}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title={L.View} onAction={onAction} />
            <Action title={L.Save} onAction={onSave} />
            <Action.CopyToClipboard
              title={L.Copy}
              content={item.text}
              shortcut={{ modifiers: ['cmd'], key: '.' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}

type Props = {
  source: string
  item: TranslateListItemData
  onSave(): void
}
