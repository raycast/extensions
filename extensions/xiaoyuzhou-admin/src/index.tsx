import { ActionPanel, Detail, List, Action } from '@raycast/api'
import { usePromise } from '@raycast/utils'
import { useState } from 'react'
import { search } from './got'
import {
  Episode,
  EpStatus,
  Podcast,
  SearchType,
  Status,
  SyncMode,
  User,
} from './type'
import dayjs from 'dayjs'
import _ from 'lodash'
import { SearchDropdownOrders, SearchTypeText } from './const'

export default function Command() {
  const [topic, setTopic] = useState(SearchType.Podcast)
  const [searchText, setSearchText] = useState<string>('')

  const { data = { data: [] }, isLoading } = usePromise(search, [topic, searchText], {
    execute: searchText.trim().length > 0,
  })

  return (
    <List
      navigationTitle="Search"
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={(text: string) => setSearchText(text)}
      searchText={searchText}
      searchBarPlaceholder="Enter phone, eid, pid, uid, keyword"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Page"
          defaultValue={SearchType.All}
          onChange={(newValue) => setTopic(newValue as SearchType)}
        >
          {SearchDropdownOrders.map((type) => (
            <List.Dropdown.Item key={type} title={SearchTypeText[type]} value={type} />
          ))}
        </List.Dropdown>
      }
    >
      {data.data.map((item) => {
        if (item.type === 'EPISODE') {
          return <EpisodeListItem key={item.id} item={item} />
        }
        if (item.type === 'PODCAST') {
          return <PodcastListItem key={item.id} item={item} />
        }
        if (item.type === 'USER') {
          return <UserListItem key={item.id} item={item} />
        }
        return
      })}
    </List>
  )
}

function getDescriptionMarkdown(description?: string) {
  const text = _.compact(['### 简介\n\n', description, '\n']).join('')
  return text
}

function PodcastListItem(props: { item: Podcast }) {
  const { item } = props
  return (
    <List.Item
      icon={item.image}
      title={item.title}
      id={item.id}
      key={item.id}
      subtitle={item.brief}
      accessories={[{ text: '节目' }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            target={
              <Detail
                markdown={getDescriptionMarkdown(item.description)}
                navigationTitle={item.title}
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.TagList title="状态/同步模式/缓存状态">
                      <Detail.Metadata.TagList.Item
                        text={getStatusText(item.status)}
                        color={'#eed535'}
                      />
                      <Detail.Metadata.TagList.Item
                        text={getSyncModeText(item.syncMode)}
                        color={'#eed535'}
                      />
                      <Detail.Metadata.TagList.Item
                        text={getCacheText(item.cacheEpisodeMedia)}
                        color={'#eed535'}
                      />
                    </Detail.Metadata.TagList>
                    <Detail.Metadata.Label
                      title="创建时间"
                      text={dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss Z[Z]')}
                    />
                    <Detail.Metadata.Label
                      title="订阅数/评论数/播放数"
                      text={[
                        item.subscriptionCount,
                        item.stats.episodeCommentCount,
                        item.stats.episodePlayCount,
                      ].join(', ')}
                    />
                    <Detail.Metadata.Label
                      title="分类"
                      text={item.categories.map((x) => x.name).join(',')}
                    />
                    <Detail.Metadata.Label title="brief" text={item.brief} />

                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Link
                      title="直达"
                      target={`https://manage.xiaoyuzhoufm.com/p/${item.id}`}
                      text="后台"
                    />
                  </Detail.Metadata>
                }
              />
            }
          />
        </ActionPanel>
      }
    />
  )
}

function EpisodeListItem(props: { item: Episode }) {
  const { item } = props
  return (
    <List.Item
      icon={item.image?.thumbnailUrl}
      title={item.title}
      id={item.eid}
      key={item.eid}
      subtitle={item.podcast.title}
      accessories={[{ text: '单集' }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            target={
              <Detail
                markdown={getDescriptionMarkdown(item.description)}
                navigationTitle={item.title}
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.TagList title="状态/同步模式/缓存状态">
                      <Detail.Metadata.TagList.Item
                        text={getEpisodeStatusText(item.status)}
                        color={'#eed535'}
                      />
                      <Detail.Metadata.TagList.Item
                        text={getCacheText(item.cacheMedia)}
                        color={'#eed535'}
                      />
                    </Detail.Metadata.TagList>
                    <Detail.Metadata.Label
                      title="发布时间"
                      text={dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss Z[Z]')}
                    />
                    <Detail.Metadata.Label
                      title="播放数/鼓掌数/评论数"
                      text={[item.playCount, item.clapCount, item.commentCount].join(', ')}
                    />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Link
                      title="直达"
                      target={`https://manage.xiaoyuzhoufm.com/e/${item.eid}`}
                      text="后台"
                    />
                  </Detail.Metadata>
                }
              />
            }
          />
        </ActionPanel>
      }
    />
  )
}

function UserListItem(props: { item: User }) {
  const { item } = props
  return (
    <List.Item
      icon={item.avatar?.picture.thumbnailUrl}
      title={item.nickname}
      id={item.uid}
      key={item.uid}
      accessories={[{ text: '用户' }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            target={
              <Detail
                markdown={'todo'}
                navigationTitle={item.nickname}
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label title="性别" text={item.gender?.toLowerCase()} />
                    <Detail.Metadata.Label
                      title="注册时间"
                      text={dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss Z[Z]')}
                    />
                    <Detail.Metadata.Label
                      title="订阅数/粉丝数/收听时长（小时）"
                      text={[
                        item.userStats.subscriptionCount,
                        item.userStats.followerCount,
                        (item.userStats.totalPlayedSeconds / 3600).toFixed(1),
                      ].join(', ')}
                    />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.Link
                      title="直达"
                      target={`https://manage.xiaoyuzhoufm.com/u/${item.uid}`}
                      text="后台"
                    />
                  </Detail.Metadata>
                }
              />
            }
          />
        </ActionPanel>
      }
    />
  )
}

function getEpisodeStatusText(status: EpStatus) {
  return (
    {
      [Status.NORMAL]: '公开',
      [Status.REMOVED]: '下架',
      [Status.DELETED]: '删除',
      [Status.INITIALIZED]: '未发布',
    }[status] ?? '未知'
  )
}

function getStatusText(status: Status) {
  return (
    {
      [Status.NORMAL]: '公开',
      [Status.PRIVATE]: '私人',
      [Status.REMOVED]: '下架',
      [Status.DELETED]: '删除',
      [Status.INITIALIZED]: '未发布',
    }[status] ?? '未知'
  )
}

function getSyncModeText(syncMode: string) {
  return (
    {
      [SyncMode.RSS]: 'RSS节目',
      [SyncMode.SELF_HOSTING]: '自托管节目',
      [SyncMode.QQ_MUSIC]: 'Q音同步节目',
    }[syncMode] ?? '未知'
  )
}

function getCacheText(cacheEpisodeMedia: boolean) {
  return cacheEpisodeMedia ? '已缓存' : '未缓存'
}
