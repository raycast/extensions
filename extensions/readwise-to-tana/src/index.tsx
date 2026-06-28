import {
  ActionPanel,
  List,
  Action,
  Icon,
  LocalStorage,
  useNavigation,
} from '@raycast/api'
import React from 'react'
import Book from './book'
import Settings from './settings'
import type { SettingsValues } from './settings'
import { useBooks } from './useApi'
import { cleanTitle } from './utils'

export default function Command() {
  const [template, setTemplate] = React.useState<string>('')
  const [category, setCategory] = React.useState<string>('all')

  const { data, isLoading } = useBooks({ category })
  const { pop } = useNavigation()

  React.useEffect(() => {
    const getTemplate = async () => {
      const template = await LocalStorage.getItem<string>('template')

      let defaultTemplate = '%%tana%%'

      defaultTemplate += '\n- {{title}}'

      let defaultHighlights = '\n\n{{#each highlights}}'
      defaultHighlights += '\n  - {{text}}'
      defaultHighlights += '\n{{/each}}'

      defaultTemplate += defaultHighlights

      setTemplate(template ?? defaultTemplate)
    }

    getTemplate()
  }, [])

  const clearSyncHistory = async () => {
    // Clear all synced items and restore template
    await LocalStorage.clear()
    await LocalStorage.setItem('template', template)
  }

  const handleSave = async (values: SettingsValues) => {
    const {
      author,
      authorSupertag,
      category,
      coverImageUrl,
      highlightColor,
      highlightHighlightedAt,
      highlightLocation,
      highlightNote,
      highlightNoteSupertag,
      highlightSupertag,
      highlightUpdatedAt,
      highlightUrl,
      highlightTags,
      id,
      readwiseUrl,
      source,
      articleSupertag,
      bookSupertag,
      podcastSupertag,
      supplementalSupertag,
      tweetSupertag,
      title,
      url,
    } = values
    let t = '%%tana%%'

    t += '{{#ifeq category "articles"}}'
    t += articleSupertag
      ? `\n- {{title}} #${articleSupertag.replaceAll('#', '')}`
      : '\n- {{title}}'
    t += '{{/ifeq}}'
    t += '{{#ifeq category "books"}}'
    t += bookSupertag
      ? `\n- {{title}} #${bookSupertag.replaceAll('#', '')}`
      : '\n- {{title}}'
    t += '{{/ifeq}}'
    t += '{{#ifeq category "podcasts"}}'
    t += podcastSupertag
      ? `\n- {{title}} #${podcastSupertag.replaceAll('#', '')}`
      : '\n- {{title}}'
    t += '{{/ifeq}}'
    t += '{{#ifeq category "supplementals"}}'
    t += supplementalSupertag
      ? `\n- {{title}} #${supplementalSupertag.replaceAll('#', '')}`
      : '\n- {{title}}'
    t += '{{/ifeq}}'
    t += '{{#ifeq category "tweets"}}'
    t += tweetSupertag
      ? `\n- {{title}} #${tweetSupertag.replaceAll('#', '')}`
      : '\n- {{title}}'
    t += '{{/ifeq}}'

    t += author
      ? `\n  - ${author}:: {{author}}${
          authorSupertag ? ` #${authorSupertag.replaceAll('#', '')}` : ''
        }`
      : ''
    t += id ? `\n  - ${id}:: {{id}}` : ''
    t += category ? `\n  - ${category}:: {{category}}` : ''
    t += source ? `\n  - ${source}:: {{source}}` : ''
    t += coverImageUrl ? `\n  - ${coverImageUrl}:: {{cover_image_url}}` : ''
    t += readwiseUrl
      ? `{{#if highlights_url}}\n  - ${readwiseUrl}:: {{highlights_url}}{{/if}}`
      : ''
    t += url ? `{{#if source_url}}\n  - ${url}:: {{source_url}}{{/if}}` : ''
    t += title ? `\n  - ${title}:: {{title}}` : ''

    let highlights = '\n\n{{#each highlights}}'

    highlights += highlightSupertag
      ? `\n  - {{text}} #${highlightSupertag.replaceAll('#', '')}`
      : '\n  - {{text}}'
    highlights += highlightLocation
      ? `{{#if location}}\n    - ${highlightLocation}:: {{location}}{{/if}}`
      : ''
    highlights += highlightTags
      ? `{{#if tags}}\n    - ${highlightTags}:: {{tags}}{{/if}}`
      : ''
    highlights += highlightUpdatedAt
      ? `{{#if updated}}\n    - ${highlightUpdatedAt}:: [[{{updated}}]]{{/if}}`
      : ''
    highlights += highlightHighlightedAt
      ? `{{#if highlighted_at}}\n    - ${highlightHighlightedAt}:: [[{{highlighted_at}}]]{{/if}}`
      : ''
    highlights += highlightColor
      ? `{{#if color}}\n    - ${highlightColor}:: {{color}}{{/if}}`
      : ''
    highlights += highlightUrl
      ? `{{#if url}}\n    - ${highlightUrl}:: {{url}}{{/if}}`
      : ''
    highlights += '\n{{#each note}}'
    highlights += highlightNote
      ? `{{#if this}}    - ${highlightNote}:: {{this}}{{/if}}`
      : `{{#if this}}    - {{this}}${
          highlightNoteSupertag
            ? ` #[[${highlightNoteSupertag.replaceAll('#', '')}]]`
            : ''
        }{{/if}}`
    highlights += '\n{{/each}}'

    highlights += '\n{{/each}}'

    t += highlights

    setTemplate(t)

    await LocalStorage.setItem('template', t)
    pop()
  }

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          onChange={setCategory}
          value={category}
        >
          <List.Dropdown.Item value="all" title="All Categories" />
          {['articles', 'books', 'podcasts', 'supplementals', 'tweets'].map(
            (value) => (
              <List.Dropdown.Item
                key={value}
                value={value}
                title={value.charAt(0).toUpperCase() + value.substring(1)}
              />
            )
          )}
        </List.Dropdown>
      }
      isLoading={isLoading}
      searchBarPlaceholder="Filter Library"
    >
      {data?.results.length === 0 ? (
        <List.EmptyView
          title={
            category === 'all' ? 'No results found' : `No ${category} found`
          }
        />
      ) : (
        data?.results.map((book) => (
          <List.Item
            key={book.id}
            icon={book.cover_image_url}
            title={cleanTitle(book.title)}
            subtitle={book.author}
            accessories={[
              { text: book.num_highlights.toString(), icon: Icon.Book },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Highlights"
                  target={<Book id={book.id} template={template} />}
                />
                <Action.Push
                  title="Update Template"
                  target={
                    <Settings template={template} handleSave={handleSave} />
                  }
                />
                <Action
                  title="Clear Sync History"
                  shortcut={{ modifiers: ['cmd'], key: 'c' }}
                  onAction={clearSyncHistory}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  )
}
