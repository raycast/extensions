import {
  Action,
  ActionPanel,
  getPreferenceValues,
  List,
  LocalStorage
} from '@raycast/api'
import { FC, useCallback, useState } from 'react'
import {
  fetchAllSheetsInfo,
  fetchSheetValues,
  ValueRange
} from '../../apis/bookmark'
import {
  BookmarkPreference,
  sheetProperties
} from '../../apis/types/bookmark.type'
import { Shortcuts } from '../../constants/shortcut'
import { useCachedPromise, usePromise } from "@raycast/utils";
import { isString } from "../../utils/string";
import { isNil, trim } from "lodash";

const getSheetNameByRange = (range: string) => {
  const [sheetName] = range.split('!')
  return trim(sheetName, '\'');
}

interface BookmarkExcel {
  sheets: { properties: sheetProperties }[];
  values: ValueRange[];
}

const Bookmark: FC = () => {
  const { bookmarkSheetIds } = getPreferenceValues<BookmarkPreference>()
  const [keyword, setKeyword] = useState('')
  const [isLoading, setLoading] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('')

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    const idList = bookmarkSheetIds.split(',').filter(id => !isNil(id));
    const results: BookmarkExcel = {
      sheets: [],
      values: []
    };

    for (const id of idList) {
      const { data: { sheets = [] } } = await fetchAllSheetsInfo(id);
      const ranges = sheets.map(({ properties: { title } }) => `'${title}'!A:C`);
      const { data: { valueRanges } } = await fetchSheetValues(id, ranges);
      results.sheets = [...results.sheets, ...sheets];
      results.values = [...results.values, ...valueRanges];
    }

    await LocalStorage.setItem("bookmarks", JSON.stringify(results));
    setLoading(false);
  }, [bookmarkSheetIds])

  const {
    data = { sheets: [], values: [] }
  } = usePromise(async (isLoading: boolean) => {
    const content = await LocalStorage.getItem('bookmarks')
    return (!isLoading && isString(content) ? JSON.parse(content) : {
      sheets: [],
      values: []
    }) as BookmarkExcel;
  }, [isLoading], {});

  return (
    <List
      searchText={keyword}
      onSearchTextChange={setKeyword}
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Squad"
                       onChange={setSelectedSheet}>
          <List.Dropdown.Item title="All" value=""/>
          <List.Dropdown.Section title="Select Squad">
            {data.sheets.map(({ properties: { title } }) => <List.Dropdown.Item
              title={title}
              value={title}/>)}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title='Reload Bookmarks'
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  onAction={loadBookmarks}/>
        </ActionPanel>
      }
    >
      {data.values
        .filter(({ range }: ValueRange) => range.includes(selectedSheet))
        .map(({ range, values }: ValueRange) => {
          const rows = values.slice(1)
          const sheetName = getSheetNameByRange(range);
          return (
            <List.Section title={sheetName}>
              {rows
                .filter(([title]) => isString(title))
                .filter(([title]) => title.toLowerCase().includes(keyword.toLowerCase()))
                .map(([title, link, comment]: string[]) =>
                  (
                    <List.Item
                      title={title}
                      subtitle={comment}
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser title="Open in browser"
                                                shortcut={Shortcuts.link}
                                                url={link}/>
                          <Action.CopyToClipboard title='Copy link'
                                                  content={link}/>
                          <Action title='Reload Bookmarks'
                                  onAction={loadBookmarks}/>
                        </ActionPanel>
                      }
                    />
                  ))}{' '}
            </List.Section>
          )
        })}
    </List>
  )
}

export { Bookmark }
