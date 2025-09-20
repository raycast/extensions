import { useFetch } from '@raycast/utils'
import { Toast, showToast } from '@raycast/api'

export const useReadme = (user: string, repo: string) => {
  const url = `https://api.github.com/repos/${user}/${repo}/readme`
  const { data, isLoading, revalidate, error } = useFetch<string, string>(url, {
    parseResponse: async (response) => {
      if (response.status === 404) {
        throw new Error(`No README found for ${user}/${repo}`)
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch README for ${user}/${repo}`)
      }
      const { content } = (await response.json()) as { content: string }
      return Buffer.from(content, 'base64').toString()
    },
    initialData: 'Loading README...',
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: `Could not load README for ${user}/${repo}`,
        message: String(err),
      })
    },
  })

  return {
    isLoading,
    data,
    revalidate,
    error,
  }
}
