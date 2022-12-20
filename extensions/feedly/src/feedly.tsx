import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  Image,
  List
} from '@raycast/api';
import { useFetch } from '@raycast/utils';
import Feed from './components/Feed';
import { Collection } from './types/collection.types';

const Feedly = () => {
  const { isLoading, data } = useFetch<Collection[]>(
    'https://cloud.feedly.com/v3/collections',
    {
      keepPreviousData: true,
      headers: {
        Authorization: getPreferenceValues().feedlyAccessToken
      }
    }
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for feeds...">
      {data?.map?.((collection) => {
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
                          icon={Icon.List}
                          target={<Feed id={feed.id} title={feed.title} />}
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
