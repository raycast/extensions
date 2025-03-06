import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import {
  DetailedItem,
  getDetailsEndpoint,
  parseDetailsResponse,
} from '../data/fetchDetails';
import { BaseItem } from '../data/fetchList';
import { usePreferences } from '../hooks/usePreferences';
import { mapTypeToTitle, processSeasons } from '../utils';
import ActionOpenInBrowserIMDb from './actions/ActionOpenInBrowserIMDb';
import ActionOpenParentalGuide from './actions/ActionOpenParentalGuide';
import ActionViewDetails from './actions/ActionViewDetails';

interface ListItemProps {
  item: BaseItem;
  showType?: boolean;
}
export const ListItem = ({ item: { imdbID }, showType }: ListItemProps) => {
  const { token, openIn } = usePreferences();
  const { data } = useFetch(getDetailsEndpoint(imdbID, token), {
    parseResponse: parseDetailsResponse,
  });

  if (!data) {
    return null;
  }

  const { Poster, Title, Year } = data;

  return (
    <List.Item
      title={Title}
      subtitle={`(${Year})`}
      icon={{ source: Poster }}
      accessories={getAccessories(data, showType)}
      actions={
        <ActionPanel>
          {openIn == 'raycast' ? (
            <>
              <ActionViewDetails item={data} />
              <ActionOpenInBrowserIMDb imdbID={imdbID} />
              <ActionOpenParentalGuide imdbID={imdbID} />
            </>
          ) : (
            <>
              <ActionOpenInBrowserIMDb imdbID={imdbID} />
              <ActionOpenParentalGuide imdbID={imdbID} />
              <ActionViewDetails item={data} />
            </>
          )}
          <Action.OpenInBrowser
            title="YouTube Trailer"
            url={`https://www.youtube.com/results?search_query=${Title.replace(
              /\s/g,
              '+',
            )}+trailer`}
            icon={Icon.Play}
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

type ItemAccessory = Exclude<
  React.ComponentProps<typeof List.Item>['accessories'],
  null | undefined
>[number];
function getAccessories(
  item: DetailedItem,
  showType?: boolean,
): ItemAccessory[] {
  const accessories = [];

  if (showType) {
    accessories.push({
      tag: mapTypeToTitle(item.Type),
    });
  }

  const typeSpecificAccessory = getTypeSpecificAccessory(item);
  if (typeSpecificAccessory !== undefined) {
    accessories.push(typeSpecificAccessory);
  }

  accessories.push({
    text: { value: item.imdbRating ?? 'N/A' },
    icon: { source: Icon.Star },
    tooltip: 'IMDb Rating',
  });

  return accessories;
}

function getTypeSpecificAccessory(
  item: DetailedItem,
): ItemAccessory | undefined {
  if (item.Type === 'movie') {
    return {
      text: item.Director ?? 'N/A',
      icon: {
        source: 'director.png',
        tintColor: Color.SecondaryText,
      },
      tooltip: 'Director',
    };
  }

  if (item.Type === 'series') {
    return {
      text: processSeasons(item.totalSeasons ?? 'N/A'),
      icon: {
        source: Icon.Hashtag,
        tintColor: Color.SecondaryText,
      },
      tooltip: 'Total Seasons',
    };
  }
}
