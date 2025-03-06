import { Detail } from '@raycast/api'
import { useArticle } from '../hooks/useArticle'
import { useErrorHandling } from '../hooks/useErrorHandling'

type ArticleDetailProps = {
  actions: JSX.Element
  isArchived: boolean
  slug: string
  username: string
}

export default function ArticleDetail({ actions, username, slug }: ArticleDetailProps) {
  const { data, error } = useArticle(username, slug)
  useErrorHandling(error)

  return <Detail actions={actions} isLoading={!data?.article} markdown={data?.article.content} />
}
