import { Detail } from '@raycast/api'
import { useReadme } from '../hooks/useReadme'

interface ReadmeProps {
  user: string
  repo: string
}

export const Readme = ({ user, repo }: ReadmeProps): JSX.Element => {
  const { data, isLoading } = useReadme(user, repo)

  return <Detail markdown={data} isLoading={isLoading} />
}
