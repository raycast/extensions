import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  List
} from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Feed as IFeed } from '../types/feed.types';

const Feed = ({ id, title }: { id: IFeed['id']; title: IFeed['title'] }) => {
  const { isLoading, data } = useFetch<IFeed>(
    `https://cloud.feedly.com/v3/streams/contents?streamId=${id}`,
    {
      keepPreviousData: true,
      headers: {
        Authorization: getPreferenceValues().feedlyAccessToken
      }
    }
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search in ${title}...`}
      navigationTitle={`Feedly: ${title}`}
    >
      {data?.items
        ?.sort?.((a, b) => b.published - a.published)
        .map?.((item) => {
          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={item.title}
              accessories={[
                {
                  date: new Date(item.published),
                  tooltip: 'Published'
                },
                {
                  text: item?.unread ? 'Unread' : null
                }
              ]}
              icon={{ source: item.visual?.edgeCacheUrl ?? Icon.Person }}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open"
                    icon={Icon.List}
                    target={
                      <Detail
                        markdown={new NodeHtmlMarkdown().translate(
                          item?.content?.content ?? item.summary?.content ?? ''
                        )}
                        actions={
                          <ActionPanel>
                            <Action.OpenInBrowser url={item.canonicalUrl} />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                  <Action.OpenInBrowser url={item.canonicalUrl} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
};

export default Feed;
