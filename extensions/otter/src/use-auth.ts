import { useCachedPromise } from '@raycast/utils'
import { authorize } from './supabase'
import { Toast, showToast } from '@raycast/api'

export function useAuth() {
  const { data, isLoading } = useCachedPromise(async () => {
    const auth = await authorize()
    let error

    if (auth.error) {
      switch (auth.error.name) {
        case 'AuthRetryableFetchError':
          error = {
            name: 'Unable to reach the server.',
            message:
              'Check your Supabase API values in the extension settings.',
          }
          break
        case 'AuthApiError':
          error = {
            name: 'Invalid login credentials.',
            message:
              'Check your username & password in the extension settings.',
          }
          break
        default:
          error = {
            name: 'Error.',
            message: 'Check the extension settings.',
          }
          break
      }

      await showToast({
        style: Toast.Style.Failure,
        title: `Otter: ${error?.name}`,
      })
    }

    return { ...auth, error }
  })

  return { data: data?.user, error: data?.error, isLoading }
}
