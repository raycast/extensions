import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
} from '@raycast/api';
import { ListItemProps, ItemResponse } from '../types';
import ItemDetail from './ItemDetail';
import { Color } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { processSeasons } from '../utils';
import { Preferences } from '../types';

const ListItem = ({ item: { imdbID } }: ListItemProps) => {
  const { token } = getPreferenceValues<Preferences>();
  const { data } = useFetch<ItemResponse>(
    `https://www.omdbapi.com/?i=${imdbID}&plot=full&apikey=${token}`
  );

  if (!data) return null;

  const {
    Director = 'N/A',
    imdbRating = 'N/A',
    Poster,
    Title,
    totalSeasons = 'N/A',
    Type,
    Year,
  } = data;
  const isMovie = Type === 'movie';

  return (
    <List.Item
      title={Title}
      subtitle={`(${Year})`}
      icon={{ source: Poster }}
      accessories={[
        {
          text: isMovie ? Director : processSeasons(totalSeasons),
          icon: {
            source: `${isMovie ? 'director' : 'number'}.png`,
            tintColor: Color.SecondaryText,
          },
          tooltip: isMovie ? 'Director' : 'Total Seasons',
        },
        {
          text: { value: imdbRating },
          icon: { source: Icon.Star },
          tooltip: 'IMDb Rating',
        },
      ]}
      actions={
        <ActionPanel>
          {data && (
            <Action.Push
              title="View Details"
              target={<ItemDetail item={data} />}
              icon={Icon.AppWindowSidebarRight}
            />
          )}
          <Action.OpenInBrowser url={`https://www.imdb.com/title/${imdbID}/`} />
          <Action.OpenInBrowser
            title="YouTube Trailer"
            url={`https://www.youtube.com/results?search_query=${Title.replace(
              /\s/g,
              '+'
            )}+trailer`}
            icon={{ source: 'youtube.png', tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ['shift', 'cmd'], key: 'y' }}
          />
          <Action.CopyToClipboard
            title="Copy IMDb URL"
            content={`https://www.imdb.com/title/${imdbID}/`}
            shortcut={{ modifiers: ['shift', 'cmd'], key: 'c' }}
          />
        </ActionPanel>
      }
    />
  );
};

export default ListItem;
