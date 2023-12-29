import { runAppleScript } from '@raycast/utils'
import { useEffect, useState } from 'react'
import { DISK_SPACE_SCRIPT } from '../utils/scripts'
import { Toast, showToast } from '@raycast/api'

export function useDiskSpace() {
  const [diskSpace, setDiskSpace] = useState<string | undefined>()
  const [loading, setLoading] = useState<boolean>(false)
  useEffect(() => {
    async function getDiskSpace() {
      setLoading(true)

      try {
        const response = await runAppleScript(DISK_SPACE_SCRIPT)
        setDiskSpace(response)
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Error executing script',
          message:
            error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string'
              ? error.message
              : undefined,
        })
      } finally {
        setLoading(false)
      }
    }

    getDiskSpace()
  }, [])

  return { data: diskSpace, loading }
}
