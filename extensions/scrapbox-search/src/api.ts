import fetch, { Response } from 'node-fetch'
import { showToast, Toast } from '@raycast/api'

export function useAPIs(projectName: string, token: string) {
  const option = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `connect.sid=${token}; Path=/; Secure; HttpOnly;`,
    },
  }

  return {
    searchByQuery: function (searchQuery: string): [req: Promise<Response>, ctl: AbortController] {
      const ctl = new AbortController()
      const signal = ctl.signal

      return [
        fetch(encodeURI(`https://scrapbox.io/api/pages/${projectName}/search/query?q=${searchQuery}`), {
          ...option,
          signal,
        }),
        ctl,
      ]
    },
    fetchRecentlyAccessedPages: async function () {
      return fetch(encodeURI(`https://scrapbox.io/api/pages/${projectName}?sort=accessed&limit=1000`), option)
    },
  }
}

export const validateResponse = (res: Response) => {
  if (!res.ok && res.status === 401) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Unauthorized!',
      message: 'You need to set access token in Preferences.',
    })
  }
}
