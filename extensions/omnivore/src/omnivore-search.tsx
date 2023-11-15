import { Action, ActionPanel, Icon, List, Toast, showToast } from '@raycast/api'
import { useState } from 'react'
import SearchDropdown from './components/SearchDropdown'
import { useArticles } from './hooks/useArticles'
import { useErrorHandling } from './hooks/useErrorHandling'
import { useUser } from './hooks/useUser'
import { Article, SearchType } from './types'
import { archiveArticle, deleteArticle } from './utils'

const appUrl = 'https://omnivore.app'

export default function ArticleList() {
  const [searchText, setSearchText] = useState('')
  const [searchType, setSearchType] = useState('in:inbox')

  const { data: articles, error: articlesError, revalidate } = useArticles(searchType, searchText)
  const { data: user, error: userError } = useUser()

  useErrorHandling(articlesError)
  useErrorHandling(userError)

  async function onActionArchiveArticle(articleId: string, toArchive: boolean) {
    const isArticleArchived = await archiveArticle(articleId, toArchive)
    if (isArticleArchived) {
      showToast({
        style: Toast.Style.Success,
        title: toArchive ? 'Archived' : 'Unarchived',
        message: toArchive ? 'Article was archived' : 'Article was unarchived',
      })
      revalidate()
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'An unexpected error occurred',
      })
    }
  }

  async function onActionDeleteArticle(articleId: string) {
    const isArticleDeleted = await deleteArticle(articleId)
    if (isArticleDeleted) {
      showToast({
        style: Toast.Style.Success,
        title: 'Deleted',
        message: 'Article was deleted',
      })
      revalidate()
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'An unexpected error occurred',
      })
    }
  }

  const searchTypes: SearchType[] = [
    { id: '1', name: 'Inbox', value: 'in:inbox' },
    { id: '2', name: 'Continue Reading', value: 'in:inbox sort:read-desc is:reading' },
    { id: '3', name: 'Library', value: 'in:library' },
    { id: '4', name: 'Highlights', value: 'has:highlights mode:highlights' },
    { id: '5', name: 'Archive', value: 'in:archive' },
  ]

  return (
    <List
      searchBarAccessory={
        <SearchDropdown searchTypes={searchTypes} onSearchTypeChange={(type) => setSearchType(type)} />
      }
      isLoading={!articles}
      searchText={searchText}
      onSearchTextChange={(text) => {
        setSearchText(text)
      }}
      throttle
    >
      {articles?.map((article: Article) => (
        <List.Item
          key={article.id}
          title={article.title}
          subtitle={article.author}
          accessories={article.labels.map((label) => ({ tag: { value: label.name, color: label.color } }))}
          id={article.id}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={{ source: 'iconmark.svg' }}
                title="Open in Omnivore"
                url={`${appUrl}/${user?.profile.username}/${article.slug}`}
              />
              <Action.OpenInBrowser title="Open Original Source" url={article.url} />
              <Action
                title={article.isArchived ? 'Unarchive Article' : 'Archive Article'}
                icon={article.isArchived ? { source: 'unarchive.svg' } : { source: 'archive.svg' }}
                onAction={() => onActionArchiveArticle(article.id, !article.isArchived)}
                shortcut={{ modifiers: ['ctrl'], key: 'a' }}
              />
              <Action
                title={'Delete Article'}
                icon={Icon.Trash}
                onAction={() => onActionDeleteArticle(article.id)}
                shortcut={{ modifiers: ['ctrl'], key: 'd' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
