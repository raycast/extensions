import {
  Action,
  ActionPanel,
  Icon,
  List,
  useNavigation,
} from '@raycast/api'
import { useSearch } from '../hook/useSearch'
import { useHistory } from '../hook/useHistory'
import { TranslateListItem } from './TranslateListItem'
import { Configure } from './Configure'
import { HistoryList } from './HistoryList'
import { FunctionComponent, useContext } from 'react'
import { PreferenceContext } from '../context/PreferenceContext'
import { L } from '../constant'

export const T: FunctionComponent = () => {
  const { source, target } = useContext(PreferenceContext)
  const { isLoading, text, setText, itemList } = useSearch(source, target)
  const { histories, onSave, onDelete } = useHistory(text)
  const { push } = useNavigation()

  return (
    <List
      navigationTitle={L.TT}
      isLoading={isLoading}
      onSearchTextChange={setText}
      searchBarPlaceholder={L.Original_Text}
      throttle
    >
      <List.Section title={text} subtitle={L.Translated_text}>
        {itemList.map((item) => (
          <TranslateListItem
            key={item.key}
            source={text}
            item={item}
            onSave={onSave}
          />
        ))}
      </List.Section>
      <List.Section
        title={L.Saved_search_results}
        subtitle={`${L.History}(${histories.length})`}
      >
        <HistoryList
          items={histories}
          onSelect={setText}
          onDelete={onDelete}
        />
      </List.Section>
      <List.Section title={L.History}>
        <List.Item
          title={L.Setting}
          accessoryIcon={Icon.Gear}
          icon={Icon.Gear}
          accessoryTitle={L.Register_API_Key}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={L.View}
                  onAction={() => {
                    push(<Configure />)
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  )
}
