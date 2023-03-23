import { ActionPanel, Detail, List, Action } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import { useState } from 'react';
import Got from './got';
import { Episode, EpStatus, Podcast, Status, SyncMode, User } from './type';
import dayjs from 'dayjs';
import * as _ from 'lodash';
export enum Topic {
  All = 'ALL',
  Podcast = 'PODCAST',
  Episode = 'EPISODE',
  User = 'USER',
}

const TopicText = {
  [Topic.All]: '全部',
  [Topic.Podcast]: '节目',
  [Topic.Episode]: '单集',
  [Topic.User]: '用户',
};

const TopicOrders = [Topic.All,Topic.Podcast, Topic.Episode, Topic.User];

export default function Command() {
  const [topic, setTopic] = useState<Topic>(Topic.Podcast);
  const [searchText, setSearchText] = useState<string>('');

  const { data = { data: [], total: 0 }, isLoading } = usePromise(search, [topic, searchText], {execute:searchText.trim().length > 0});

  return (
    <List
      navigationTitle="一键搜索"
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={(text: string) => setSearchText(text)}
      searchText={searchText}
      searchBarPlaceholder="输入手机号、eid、pid、uid、keyword"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Page"
          defaultValue={Topic.All}
          // storeValue
          onChange={(newValue) => setTopic(newValue as Topic)}
        >
          {TopicOrders.map((key) => (
            <List.Dropdown.Item key={key} title={TopicText[key]} value={key} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Item
        key='test'
        icon="list-icon.png"
        title="Greeting"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      />
      {data.data.map((item) =>{
        if (item.type === 'EPISODE'){
          return <EpisodeListItem key={item.id} item={item} />
        }
        if (item.type === 'PODCAST'){
          return <PodcastListItem key={item.id} item={item} />
        }
        if (item.type === 'USER'){
          return <UserListItem key={item.id} item={item} />
        }
         console.log('??')
        return undefined
      } )  }
    </List>
  );
}


function getJson(item: Podcast){  
 const text = [
  '### 简介\n\n',
  item.description,
  '\n',
  '### Raw\n\n',
  '```javascript\n',
  JSON.stringify(item) + '\n',
  '```'
].join('')
 return text
}

function PodcastListItem(props: {item: Podcast}) {
  const { item}=props
 return  <List.Item
  icon={item.image}
  title={item.title}
  id={item.id}
  key={item.id}
  subtitle={item.brief}
  accessories={[{ text: '节目'  }]}
  actions={
    <ActionPanel>
      <Action.Push
        title="Show Details"
        target={
          <Detail
            markdown={ getJson(item)}
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
                <Detail.Metadata.Label title="简介" text={item.description} />
              </Detail.Metadata>
            }
          />
        }
      />
    </ActionPanel>
  }
/>
}

function EpisodeListItem(props: {item: Episode}) {
  const { item } = props
  return <List.Item
  icon={item.image?.thumbnailUrl}
  title={item.title}
  id={item.eid}
  key={item.eid}
  // subtitle={ item.description }
  accessories={[{text: '单集' }]}
  actions={
    <ActionPanel>
      <Action.Push title="Show Details" target={<Detail markdown={item.description}
        navigationTitle={item.title}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="状态/同步模式/缓存状态">
              <Detail.Metadata.TagList.Item text={getEpisodeStatusText(item.status)} color={"#eed535"} />
              <Detail.Metadata.TagList.Item text={getCacheText(item.cacheMedia)} color={"#eed535"} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="发布时间" text={dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss Z[Z]')} />
            <Detail.Metadata.Label title="播放数/鼓掌数/评论数" text={[item.playCount, item.clapCount, item.commentCount].join(', ' ) } />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="直达" target={`https://manage.xiaoyuzhoufm.com/e/${item.eid}`} text="后台" />
          </Detail.Metadata>
        }
      />} />
    </ActionPanel>
  }
/>
}

function UserListItem(props: {item: User}) {
  const { item } = props
  return <List.Item
  icon={item.avatar?.picture.thumbnailUrl}
  title={item.nickname}
  id={item.uid}
  key={item.uid}
  // subtitle={ item.description }
  accessories={[{ text: '用户' }]}
  // actions={
  //   <ActionPanel>
  //     <Action.Push title="Show Details" target={<Detail markdown={item.description}
  //       navigationTitle={item.title}
  //       metadata={
  //         <Detail.Metadata>
  //           <Detail.Metadata.TagList title="状态/同步模式/缓存状态">
  //             <Detail.Metadata.TagList.Item text={getEpisodeStatusText(item.status)} color={"#eed535"} />
  //             {/* <Detail.Metadata.TagList.Item text={getSyncModeText(item.syncMode)} color={"#eed535"} /> */}
  //             <Detail.Metadata.TagList.Item text={getCacheText(item.cacheMedia)} color={"#eed535"} />
  //             {/* <Detail.Metadata.TagList.Item text={item.isPayEpisode} color={"#eed535"} /> */}

  //           </Detail.Metadata.TagList>

  //           <Detail.Metadata.Label title="发布时间" text={dayjs(item.pubDate).format('YYYY-MM-DD HH:mm:ss Z[Z]')} />
  //           <Detail.Metadata.Label title="播放数/鼓掌数/评论数" text={[item.playCount, item.clapCount, item.commentCount].join(', ' ) } />

  //           <Detail.Metadata.Separator />
  //           <Detail.Metadata.Link title="直达" target={`https://manage.xiaoyuzhoufm.com/e/${item.eid}`} text="后台" />
  //           {/* <Detail.Metadata.Label title="简介" text={item.description} /> */}

  //         </Detail.Metadata>
  //       }
  //     />} />
  //   </ActionPanel>
  // }
/>
}
type mapped = {
  [Topic.Podcast]: Podcast,
  [Topic.Episode]: Episode
  [Topic.User]: User  
  [Topic.All]:Podcast | Episode | User 
}

async function search<T extends Topic>(type: T, keyword: string):Promise< {data: mapped[T][], total: number}> {
  console.log(type, keyword);
  // const podcastDefaultQuery = {
  //   sortBy: 'subscriptionCount',
  //   order: 'desc',
  //   keyword,
  //   status: 'NORMAL'
  // }
  // const epDefaultQuery = { order: 'desc', keyword, status: 'NORMAL', sortBy: 'playCount' },
  // _.random(10, 10000, false)
  const { data, total } = await Got({
    method: 'post',
    url: 'http://podcast-service-yangmei.podcast-beta.svc.cluster.local:3000/management/search/create',
    json: {
      type,
      skip: 0,
      limit: 10,
      query: { keyword }
    },
  }).json<{ data: mapped[T][]; total: number }>();

  return { data, total };
}

function getEpisodeStatusText(status: EpStatus) {
  return (
    {
      [Status.NORMAL]: '公开',
      [Status.REMOVED]: '下架',
      [Status.DELETED]: '删除',
      [Status.INITIALIZED]: '未发布',
    }[status] ?? '未知'
  );
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
  );
}

function getSyncModeText(syncMode: string) {
  return (
    {
      [SyncMode.RSS]: 'RSS节目',
      [SyncMode.SELF_HOSTING]: '自托管节目',
      [SyncMode.QQ_MUSIC]: 'Q音同步节目',
    }[syncMode] ?? '未知'
  );
}

function getCacheText(cacheEpisodeMedia: boolean) {
  return cacheEpisodeMedia ? '已缓存' : '未缓存';
}
