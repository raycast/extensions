import { showToast, Toast } from '@raycast/api'
import { runAppleScript } from '@raycast/utils'
import { useEffect, useState } from 'react'
import { App } from '../types'
import { APPS_SPACE_SCRIPT } from '../utils/scripts'

export function useApps() {
  const [apps, setApps] = useState<App[] | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getAppSpace() {
      setLoading(true)
      try {
        const response = await runAppleScript(APPS_SPACE_SCRIPT)

        const rawApps = response.split(', name:')
        const appsList = rawApps.map((app, index) => {
          // Prepend 'name:' to all segments except the first one
          const appInfo = (index === 0 ? '' : 'name:') + app

          // Extract app details
          const nameMatch = appInfo.match(/name:([^,]+)/)
          const sizeMatch = appInfo.match(/size:([^,]+)/)
          const iconPathMatch = appInfo.match(/iconPath:([^,]+)/)

          return {
            name: nameMatch ? nameMatch[1].replace('.app', '') : 'Unknown',
            size: sizeMatch ? sizeMatch[1] : 'Unknown',
            iconPath: iconPathMatch ? iconPathMatch[1] : 'Unknown',
          }
        })

        setApps(appsList)
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

    getAppSpace()
  }, [])

  return { data: apps, loading }
}
