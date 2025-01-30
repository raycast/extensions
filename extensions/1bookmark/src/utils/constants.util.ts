import { getPreferenceValues } from '@raycast/api'
import { join } from 'node:path'

const DEFAULT_API_URL = 'https://1bookmark-web-and-server.vercel.app/'

// apiUrl is not used in production environment.
// So we can use Preferences type to get apiUrl.
export const API_URL = getPreferenceValues().apiUrl || DEFAULT_API_URL
export const API_URL_TRPC = join(API_URL, '/api/trpc')
export const API_URL_SIGNIN = join(API_URL, '/api/raycast-login')
