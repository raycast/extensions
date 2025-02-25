import { ActionPanel, Detail, Toast, showToast } from '@raycast/api';
import { useFetch } from '@raycast/utils';

import { BoardGame, BggDetailsResponse } from '../models';
import { parseGameData } from '../utils';
import UrlActions from './UrlActions';

interface DetailsProps {
  item: BoardGame;
}

export default function Details({ item }: DetailsProps) {
  const { isLoading, data } = useFetch<BggDetailsResponse>(`https://boardgamegeek.com/xmlapi2/thing?id=${item.bggId}`, {
    execute: !!item,
    parseResponse: (response: Response) => parseGameData(response),
    onError: (error) => {
      console.error(error);
      showToast(Toast.Style.Failure, 'Could not fetch game details');
    },
    keepPreviousData: true,
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={`
![](${data?.img})


${data?.description?.split('<br/>')?.join('\n')}
        `}
      navigationTitle={item.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Players" text={`${data?.minPlayers} - ${data?.maxPlayers}`} />
          <Detail.Metadata.Label title="Average Playtime" text={`${data?.avgPlaytime} Minutes`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <UrlActions item={item} />
        </ActionPanel>
      }
    />
  );
}
