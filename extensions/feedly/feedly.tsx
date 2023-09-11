import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  Image,
  List
} from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import Feed from './components/Feed';
import { Collection } from './types/collection.types';

const Feedly = () => {
  const { data: collections, isLoading } = useCachedPromise(fetchContent, [], {
    keepPreviousData: true
  });

  async function fetchContent() {
    const data: Collection[] = await fetch(
      'https://cloud.feedly.com/v3/collections',
      {
        headers: {
          Authorization: getPreferenceValues().feedlyAccessToken
        }
      }
    ).then((response) => response.json());

    return data;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for feeds...">
      {collections?.map?.((collection) => {
        return (
          <List.Section
            key={collection.id}
            title={collection.label}
            subtitle={collection.numFeeds + ' Feeds'}
          >
            {collection?.feeds
              ?.sort((a, b) => b.updated - a.updated)
              ?.map((feed) => {
                return (
                  <List.Item
                    key={feed.id}
                    id={feed.id}
                    title={feed.title}
                    icon={{
                      source: feed.visualUrl ?? Icon.Person,
                      mask: Image.Mask.RoundedRectangle
                    }}
                    accessories={[
                      {
                        date: new Date(feed.updated)
                      }
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="Open"
                          target={<Feed id={feed?.id} />}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        );
      })}
    </List>
  );
};

export default Feedly;
