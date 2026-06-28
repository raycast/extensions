import { Toast, showToast } from '@raycast/api'
import { useEffect } from 'react'

export function useErrorHandling(error?: Error, title: string = 'Error') {
  useEffect(() => {
    if (error) {
      showToast({
        title,
        style: Toast.Style.Failure,
        message: error.message,
      })
    }
  }, [error])
}
