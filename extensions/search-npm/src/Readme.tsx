import { Detail } from '@raycast/api'
import { useCachedPromise } from '@raycast/utils'
import { fetchReadme } from 'fetch-readme'

interface ReadmeProps {
  user: string
  repo: string
}

export const Readme = ({ user, repo }: ReadmeProps): JSX.Element => {
  const { data, isLoading } = useCachedPromise(fetchReadme, [user, repo])

  return <Detail markdown={data} isLoading={isLoading} />
}
