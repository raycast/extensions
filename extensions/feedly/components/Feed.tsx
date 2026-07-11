import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  List
} from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Feed as IFeed } from '../types/feed.types';

const Feed = ({ id }: { id: IFeed['id'] }) => {
  const { data: feed, isLoading } = useCachedPromise(fetchContent, [id]);

  async function fetchContent(id: string) {
    const data: IFeed = await fetch(
      `https://cloud.feedly.com/v3/streams/contents?streamId=${id}`,
      {
        headers: {
          Authorization: getPreferenceValues().feedlyAccessToken
        }
      }
    ).then((response) => response.json());

    return data;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for feed">
      {feed?.items
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
                    title="Opedn"
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
