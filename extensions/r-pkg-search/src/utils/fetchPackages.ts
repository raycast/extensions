import { showToast, Toast, ToastStyle } from '@raycast/api'
import { link } from 'fs'
import fetch from 'node-fetch'
import {
  Links,
  RpkgFetchResponse,
  RpkgResultModel,
} from '../RpkgResponse.model'
import { parseRepoUrl } from './parseRepoUrl'

const splitDepends = (depends: string): string[] => {
  if (!depends) {
    return []
  }

  return depends
    .split(', ')
    .map((dep) => dep.replace(' (*)', ''))
    .filter((s) => s !== '')
}

export const fetchPackages = async (
  searchTerm = '',
): Promise<RpkgFetchResponse> => {
  try {
    const response = await fetch(
      `http://search.r-pkg.org/_search?q=${searchTerm}&size=25`,
    )
    const json: any = await response.json()
    const pkgs = json.hits.hits
      .map((hit: any) => {
        const { _source: src } = hit

        const links = {} as Links
        links.bugs = src.BugReports
        if (src.URL) {
          const urls = src.URL.split(/,\s*/)
          if (urls.length) {
            links.url = urls
            const idxRepo = urls.findIndex((l: string) =>
              /(github|gitlab)[.]com/.test(l),
            )
            if (idxRepo > -1) {
              links.repo = links.url.splice(idxRepo, 1)[0] || null
            }

            if (links.url.length == 0 && links.repo) {
              links.url = [links.repo]
            }
          }
        }

        const pkg = {
          name: src.Package,
          authors: src.Author.split(/,\n/) || [],
          version: src.Version,
          title: src.Title,
          description: src.Description,
          date: src.Date || src['Date/Publication'],
          license: src.License,
          downloads: src.downloads,
          depends: splitDepends(src.Depends),
          imports: splitDepends(src.Imports),
          suggests: splitDepends(src.Suggests),
          systemRequirements: splitDepends(src.SystemRequirements),
          revdeps: src.revdeps - 1, // -1 because of the package itself
          links,
          repo: links?.repo ? parseRepoUrl(links.repo) : null,
        }
        return {
          package: pkg,
          searchScore: hit._score + (src.Package === searchTerm ? 100 : 0),
          highlight: searchTerm,
        }
      })
      .sort(
        (a: RpkgResultModel, b: RpkgResultModel) =>
          b.searchScore - a.searchScore,
      )
    return pkgs as RpkgFetchResponse
  } catch (error) {
    console.error(error)
    showToast(Toast.Style.Failure, 'Could not fetch packages')
    return Promise.resolve([])
  }
}
