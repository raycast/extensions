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

export async function saveUrl(url: string, labels: string): Promise<boolean> {
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
      return true
    } else {
      console.error('Error during fetch')
      return false
    }
  } catch (error) {
    console.error('Server error:', error)
    return false
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
