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
import formatTitle from 'title'
import { Bookmark } from '../types'
import { getFavicon } from '@raycast/utils'
import { simpleUrl } from '../utils/simpleUrl'
import { typeToIcon } from '../utils/typeToIcon'

type LinkItemProps = Bookmark

const prefs = getPreferenceValues()
const showDetail = prefs?.showDetailView

export const LinkItem = ({
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
  image,
  modified_at,
}: LinkItemProps) => {
  if (!url || !title) {
    return null
  }

  const accessories = [
    {
      icon: Icon.Calendar,
      tooltip: `Added: ${tinyRelativeDate(new Date(created_at))}`,
    },
  ]
  if (type) {
    accessories.push({
      icon: typeToIcon(type),
      tooltip: formatTitle(type),
    })
  }
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

  const descriptionDetail = `![](${image})\n\n${description}`
  let detailViewContent = `## ${title}\n\n`
  if (description) {
    detailViewContent += `${description}\n`
  }
  if (note) {
    detailViewContent += `### Note\n${note}`
  }

  let favicon: Image.ImageLike
  try {
    favicon = getFavicon(url, {
      mask: Image.Mask.Circle,
      fallback: Icon.Bookmark,
    })
  } catch (err) {
    favicon = {
      source: `https://logo.clearbit.com/${simpleUrl(url)}`,
      mask: Image.Mask.Circle,
      fallback: Icon.Bookmark,
    }
  }

  return (
    <List.Item
      title={title}
      subtitle={showDetail ? '' : description || ''}
      icon={favicon}
      accessories={showDetail ? null : accessories}
      keywords={tags ?? []}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} title="Open URL" />
          <Action.OpenInBrowser
            url={urlJoin(prefs.otterBasePath, 'bookmark', id)}
            title="Open Item in Otter"
          />
          <Action.OpenInBrowser
            url={urlJoin(prefs.otterBasePath, 'bookmark', id, 'edit')}
            title="Edit Item in Otter"
            icon={Icon.Pencil}
          />
          <Action.CopyToClipboard title="Copy Url" content={url} />
          {description ? (
            <Action.Push
              title="View Description"
              target={<Detail markdown={descriptionDetail} />}
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
      detail={
        <List.Item.Detail
          markdown={detailViewContent}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link
                title="URL"
                target={url}
                text={url}
              />
              {tags?.length ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {tags?.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      text={tag}
                      icon={Icon.Hashtag}
                      key={`detail-tag-${tag}`}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {type ? (
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={formatTitle(type)}
                  icon={typeToIcon(type)}
                />
              ) : null}

              <List.Item.Detail.Metadata.Label
                title="Date added"
                text={tinyRelativeDate(new Date(created_at))}
                icon={Icon.Calendar}
              />
              {modified_at !== created_at ? (
                <List.Item.Detail.Metadata.Label
                  title="Date modified"
                  text={tinyRelativeDate(new Date(modified_at))}
                  icon={Icon.Calendar}
                />
              ) : null}
              {star ? (
                <List.Item.Detail.Metadata.Label
                  title="Starred"
                  icon={Icon.Star}
                />
              ) : null}
              {isPublic ? (
                <List.Item.Detail.Metadata.Label
                  title="Public"
                  icon={Icon.Eye}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  )
}
