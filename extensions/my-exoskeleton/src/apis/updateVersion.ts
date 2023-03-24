import { environment, getPreferenceValues } from '@raycast/api'
import { DefaultVersion } from '../constants/update-version'
import { initHttpClient } from '../utils/httpClient'
import { LatestReleaseResponse } from './types/updateVersion.type'

const REPOSITORY_API = 'https://api.github.com/repos/li-qiang/my-exoskeleton'
const { githubToken } = getPreferenceValues()
const httpClient = initHttpClient({
  headers: {
    Authorization: `token ${githubToken}`
  }
})

const fetchLatestRelease = () => httpClient.get<LatestReleaseResponse>(`${REPOSITORY_API}/releases/latest`)

const fetchLocalVersion = (): { version: string } => {
  try {
    return require(`${environment.assetsPath}/version.json`)
  } catch (error) {
    return { version: DefaultVersion }
  }
}

export { fetchLatestRelease, fetchLocalVersion }
