import { List, Cache } from '@raycast/api'
import { useEffect, useReducer, useCallback } from 'react'
import trending from './lib/trending-github'

import { DropdownRange } from './components/DropdownRange'
import { ListItemLanguage } from './components/ListItemLanguage'
import { ListItemRepo } from './components/ListItemRepo'

import { PROGRAMMING_LANGUAGES } from './constants'
import { commandReducer } from './reducer'
import { RepoType } from './type'

const cache = new Cache()

const parseCache = (key: string) => {
  const data = cache.get(key)
  if (data) {
    return JSON.parse(data)
  }
  return null
}

const setCache = (key: string, data: unknown, date: string) => {
  cache.set(key, JSON.stringify(data))
  cache.set('date', date)
}

export default function Command() {
  const [state, dispatch] = useReducer(commandReducer, {
    selectedLanguage: '',
    isLoading: false,
    repos: [],
    query: '',
    range: 'daily',
  })

  useEffect(() => {
    async function fetchRepos() {
      try {
        dispatch({ type: 'SET_IS_LOADING', payload: true })
        const cacheDate = cache.get('date')
        const currentDate = new Date().getDate().toString()
        const isCacheExpired = cacheDate !== currentDate
        const key = `${state.selectedLanguage}-${state.range}`

        let result

        if (isCacheExpired) {
          cache.clear()

          result = await trending(state.range, state.selectedLanguage)
          setCache(key, result, currentDate)
        } else if (!cache.has(key)) {
          result = await trending(state.range, state.selectedLanguage)
          setCache(key, result, currentDate)
        } else {
          result = parseCache(key)
        }

        dispatch({ type: 'SET_REPOS', payload: result as RepoType[] })
        dispatch({ type: 'SET_IS_LOADING', payload: false })
      } catch (error) {
        dispatch({ type: 'SET_IS_LOADING', payload: false })
      }
    }

    fetchRepos()
  }, [state.selectedLanguage, state.range])

  const handleSearchFilterChange = useCallback((searchFilter: string) => {
    if (searchFilter === '') {
      dispatch({ type: 'SET_QUERY', payload: '' })
      return dispatch({ type: 'SET_SELECTED_LANGUAGE', payload: '' })
    }
    dispatch({ type: 'SET_QUERY', payload: searchFilter })
  }, [])

  const handleTimeRangeChange = useCallback((timeRange: string) => {
    dispatch({ type: 'SET_RANGE', payload: timeRange })
  }, [])

  const handleLanguageChange = useCallback((language: string) => {
    dispatch({ type: 'SET_SELECTED_LANGUAGE', payload: language })
    dispatch({ type: 'SET_QUERY', payload: '' })
  }, [])

  return (
    <List
      onSearchTextChange={handleSearchFilterChange}
      navigationTitle="Trending Repositories"
      isLoading={state.isLoading || state.repos.length === 0}
      searchBarPlaceholder="Search for a language..."
      searchBarAccessory={<DropdownRange selectedRange={state.range} onChangeRange={handleTimeRangeChange} />}
      throttle
    >
      {state.query === ''
        ? state.repos.map((repo) => (
            <ListItemRepo key={repo.author + '/' + repo.name} repo={repo} onRangeChange={handleTimeRangeChange} />
          ))
        : PROGRAMMING_LANGUAGES.filter((lang) => lang.toLowerCase().includes(state.query.toLowerCase())).map(
            (lang, idx) => <ListItemLanguage key={lang + idx} lang={lang} onLanguageChange={handleLanguageChange} />,
          )}
    </List>
  )
}
