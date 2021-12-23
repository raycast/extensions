import { showToast, ToastStyle } from '@raycast/api'
import axios from 'axios'
import type { ICreate, ICreateRaw } from './typings'

const ENDPOINT = 'https://crates.io/api/v1/crates?page=1&per_page=7&q='

export default async function fetchPackages(searchString: string) {
  try {
    if (searchString.length === 0) return [] as ICreate[]

    const res = await axios.get(ENDPOINT + searchString.replace(/\s/g, '+'))

    const packages = res.data.crates.map((crate: ICreateRaw) => {
      return {
        name: crate.name,
        description: crate.description,
        version: crate.max_version,
        numberOfDownloads: crate.downloads,
        installCommand: `${crate.name} = "${crate.max_version}"`,
        urlCratesIo: `https://crates.io/crates/${crate.name}`,
        urlRepo: crate.repository,
        urlDocumentation: crate.documentation,
      }
    })
    return packages as ICreate[]
  } catch (e) {
    showToast(ToastStyle.Failure, 'Failed fetching packages')
    return [] as ICreate[]
  }
}
