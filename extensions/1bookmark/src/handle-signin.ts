import { join } from 'node:path'
import { hostname } from 'node:os'
import { getPreferenceValues, showToast, Toast } from '@raycast/api'
import axios from 'axios'

interface Preferences {
  apiUrl: string
}

const DEFAULT_API_URL = 'https://1bookmark-web-and-server.vercel.app/'
const API_URL = getPreferenceValues<Preferences>().apiUrl || DEFAULT_API_URL
const API_URL_SIGNIN = join(API_URL, '/api/raycast-login')

export const handleSignIn = async (form: { email: string; token: string; onSuccess: (token: string) => void }) => {
  const { email, token, onSuccess } = form
  try {
    const deviceName = hostname()
    const res = await axios.post(API_URL_SIGNIN, { email, token, deviceName })
    const setCookieHeaders = res?.headers?.['set-cookie']
    const sessionTokenLine = setCookieHeaders?.find((header: string) => header.includes('authjs.session-token='))

    if (!sessionTokenLine) {
      throw new Error('session 응답 실패')
    }

    showToast({
      style: Toast.Style.Success,
      title: 'Signin Success',
    })

    console.log('🚀 login success!')
    onSuccess(sessionTokenLine)
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Signin Failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}
