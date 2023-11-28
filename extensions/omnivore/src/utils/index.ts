import { getPreferenceValues } from '@raycast/api'
import fetch from 'node-fetch'
import { archiveArticleQuery, deleteArticleQuery } from '../graphql/queries'

const { apiKey } = getPreferenceValues<{ apiKey: string }>()

export async function archiveArticle(articleId: string, toArchive: boolean): Promise<boolean> {
  try {
    const response = await fetch('https://api-prod.omnivore.app/api/graphql', {
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

  const labelsArray = labels
    .split(',')
    .map((label) => `&labels=${encodeURIComponent(label.trim())}`)
    .join('')
  const apiUrlWithLabels = `https://omnivore.app/api/save?url=${encodeURIComponent(url)}${labelsArray}`

  try {
    const response = await fetch(apiUrlWithLabels, {
      method: 'GET',
      headers: {
        authorization: apiKey,
      },
    })

    if (response.ok) {
      return { success: true, message: 'Your URL was saved' }
    } else {
      console.error('Error during fetch')
      return { success: false, message: 'Error during saving' }
    }
  } catch (error) {
    console.error('Server error:', error)
    return { success: false, message: 'Server error' }
  }
}

export async function deleteArticle(articleId: string): Promise<boolean> {
  try {
    const response = await fetch('https://api-prod.omnivore.app/api/graphql', {
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
    console.error('Error during fetch:', error)
    return false
  }
}
