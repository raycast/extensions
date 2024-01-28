import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  getPreferenceValues,
  Image,
} from '@raycast/api'
import urlJoin from 'proper-url-join'
import tinyRelativeDate from 'tiny-relative-date'
import { simpleUrl } from './utils/simpleUrl'
import formatTitle from 'title'
import { BaseBookmark } from './types'

interface ItemProps extends BaseBookmark {
  id: string
}

const typeToIcon = (type: string | null) => {
  switch (type) {
    case 'article':
      return Icon.Document
    case 'video':
      return Icon.Video
    case 'audio':
      return Icon.Music
    case 'image':
      return Icon.Image
    case 'recipe':
      return Icon.Leaf
    case 'document':
      return Icon.Document
    case 'product':
      return Icon.Car
    case 'game':
      return Icon.GameController
    case 'link':
      return Icon.Link
    case 'note':
      return Icon.Snippets
    case 'event':
      return Icon.Clock
    default:
      return null
  }
}

export const Item = ({
  title,
  description,
  url,
  tags,
  created_at,
  note,
  id,
  type,
  star,
  public: isPublic,
}: ItemProps) => {
  const pref = getPreferenceValues()

  if (!url || !title) {
    return null
  }

  const accessories = [
    {
      icon: Icon.Calendar,
      tooltip: `Added: ${tinyRelativeDate(new Date(created_at))}`,
    },
    {
      icon: typeToIcon(type),
      tooltip: formatTitle(type),
    },
  ]
  if (tags?.length) {
    accessories.push({
      icon: Icon.Hashtag,
      tooltip: `Tags: ${tags?.join(', ')}`,
    })
  }
  if (note) {
    accessories.push({
      icon: Icon.Snippets,
      tooltip: note,
    })
  }
  if (star) {
    accessories.push({
      icon: Icon.StarCircle,
      tooltip: 'Starred',
    })
  }
  if (isPublic) {
    accessories.push({
      icon: Icon.Eye,
      tooltip: 'Public',
    })
  }

  return (
    <List.Item
      title={title}
      subtitle={description || ''}
      icon={{
        source: `https://logo.clearbit.com/${simpleUrl(url)}`,
        mask: Image.Mask.Circle,
        tooltip: url,
      }}
      accessories={accessories}
      keywords={tags ?? []}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} title="Open url" />
          <Action.OpenInBrowser
            url={urlJoin(pref.otterBasePath, 'bookmark', id)}
            title="Open item in Otter"
          />
          <Action.CopyToClipboard title="Copy url" content={url} />
          {description ? (
            <Action.Push
              title="View Description"
              target={<Detail markdown={description} />}
              icon={Icon.Document}
            />
          ) : null}
          {note ? (
            <Action.Push
              title="View Note"
              target={<Detail markdown={note} />}
              icon={Icon.Snippets}
            />
          ) : null}
        </ActionPanel>
      }
    />
  )
}
