import { Action, ActionPanel, Icon, Toast, showToast } from '@raycast/api'
import { Article, User } from '../types'
import { archiveArticle, deleteArticle } from '../utils'
import ArticleDetail from './ArticleDetail'

type ArticleActionsProps = {
  article: Article
  revalidate: () => void
  user?: User
  isInDetail?: boolean
}

const appUrl = 'https://omnivore.app'

export default function ArticleActions({ article, revalidate, user, isInDetail }: ArticleActionsProps) {
  async function onActionArchiveArticle(articleId: string, toArchive: boolean) {
    showToast({
      style: Toast.Style.Animated,
      title: 'Archiving Article',
    })

    const isArticleArchived = await archiveArticle(articleId, toArchive)
    if (isArticleArchived) {
      showToast({
        style: Toast.Style.Success,
        title: toArchive ? 'Archived' : 'Unarchived',
        message: toArchive ? 'Article was archived' : 'Article was unarchived',
      })
      revalidate()
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'An unexpected error occurred',
      })
    }
  }

  async function onActionDeleteArticle(articleId: string) {
    showToast({
      style: Toast.Style.Animated,
      title: 'Deleting Article',
    })

    const isArticleDeleted = await deleteArticle(articleId)
    if (isArticleDeleted) {
      showToast({
        style: Toast.Style.Success,
        title: 'Deleted',
        message: 'Article was deleted',
      })
      revalidate()
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'An unexpected error occurred',
      })
    }
  }

  return (
    <ActionPanel>
      {!isInDetail && (
        <Action.Push
          title="Quick Look"
          icon={Icon.Eye}
          target={
            <ArticleDetail
              actions={<ArticleActions article={article} user={user} isInDetail={true} revalidate={revalidate} />}
              isArchived={article.isArchived}
              slug={article.slug}
              username={user?.profile.username ?? ''}
            />
          }
        />
      )}
      <Action.OpenInBrowser
        icon={{ source: 'iconmark.svg' }}
        title="Open in Omnivore"
        url={`${appUrl}/${user?.profile.username}/${article.slug}`}
      />
      <Action.OpenInBrowser
        title="Open Original Source"
        url={article.url}
        shortcut={{ modifiers: ['ctrl'], key: 'o' }}
      />
      <Action
        title={article.isArchived ? 'Unarchive Article' : 'Archive Article'}
        icon={article.isArchived ? { source: 'unarchive.svg' } : { source: 'archive.svg' }}
        onAction={() => onActionArchiveArticle(article.id, !article.isArchived)}
        shortcut={{ modifiers: ['ctrl'], key: 'a' }}
      />
      <Action
        title={'Delete Article'}
        icon={Icon.Trash}
        onAction={() => onActionDeleteArticle(article.id)}
        shortcut={{ modifiers: ['ctrl'], key: 'd' }}
      />
    </ActionPanel>
  )
}
