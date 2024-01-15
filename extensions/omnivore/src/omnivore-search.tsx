import { List } from '@raycast/api'
import { useState } from 'react'
import ArticleActions from './components/ArticleActions'
import SearchDropdown from './components/SearchDropdown'
import { useArticles } from './hooks/useArticles'
import { useErrorHandling } from './hooks/useErrorHandling'
import { useUser } from './hooks/useUser'
import { Article, SearchType } from './types'

export default function ArticleList() {
  const [searchText, setSearchText] = useState('')
  const [searchType, setSearchType] = useState('in:inbox')

  const { data: articles, error: articlesError, revalidate } = useArticles(searchType, searchText)
  const { data: user, error: userError } = useUser()

  useErrorHandling(articlesError)
  useErrorHandling(userError)

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
          actions={<ArticleActions article={article} user={user} revalidate={revalidate} />}
        />
      ))}
    </List>
  )
}
