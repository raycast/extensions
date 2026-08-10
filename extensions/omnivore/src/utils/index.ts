import { getPreferenceValues } from '@raycast/api'
import fetch from 'node-fetch'
import { archiveArticleQuery, deleteArticleQuery, saveArticleQuery } from '../graphql/queries'

import { v4 as uuidv4 } from 'uuid'

const { apiKey } = getPreferenceValues<{ apiKey: string }>()
const apiUrl = 'https://api-prod.omnivore.app/api/graphql'

export async function archiveArticle(articleId: string, toArchive: boolean): Promise<boolean> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: archiveArticleQuery,
        variables: {
          input: {
            linkId: articleId,
            archived: toArchive,
          },
        },
      }),
    })

    if (response.ok) {
      return true
    } else {
      const errorData = await response.json()
      console.error('Error during fetch:', JSON.stringify(errorData))
      return false
    }
  } catch (error) {
    console.error('Server error:', error)
    return false
  }
}

export async function saveUrl(url: string, labels: string): Promise<{ success: boolean; message: string }> {
  try {
    new URL(url)
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Invalid URL:', error.message)
      return { success: false, message: 'Incorrect URL' }
    } else {
      console.error('Unexpected error:', error)
      return { success: false, message: 'Unexpected error occurred' }
    }
  }

  const clientRequestId = uuidv4() // Generate a unique ID for each request

  const formatLabels = (labels: string): Array<{ name: string }> | null => {
    if (!labels.trim()) return null
    return labels
      .split(',')
      .filter((label) => label.trim() !== '')
      .map((label) => ({ name: label.trim() }))
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: saveArticleQuery,
        variables: {
          input: {
            clientRequestId,
            source: 'api',
            url: url,
            labels: formatLabels(labels),
          },
        },
      }),
    })

    if (response.ok) {
      return { success: true, message: 'Your URL was saved' }
    } else {
      const errorData = await response.json()
      console.error('Error during fetch:', JSON.stringify(errorData))
      return { success: false, message: 'Error during saving' }
    }
  } catch (error) {
    console.error('Server error:', error)
    return { success: false, message: 'Server error' }
  }
}

export async function deleteArticle(articleId: string): Promise<boolean> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: deleteArticleQuery,
        variables: {
          input: {
            articleID: articleId,
            bookmark: false,
          },
        },
      }),
    })

    if (response.ok) {
      return true
    } else {
      const errorData = await response.json()
      console.error('Error during fetch:', JSON.stringify(errorData))
      return false
    }
  } catch (error) {
    console.error('Server error:', error)
    return false
  }
}
