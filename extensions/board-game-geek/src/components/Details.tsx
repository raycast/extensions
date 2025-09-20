import { List } from '@raycast/api';
import { showFailureToast, useFetch } from '@raycast/utils';

import { BoardGame, BggDetailsResponse } from '../models';
import { parseGameData } from '../utils';

interface DetailsProps {
  item: BoardGame;
}

export default function Details({ item }: DetailsProps) {
  const { isLoading, data } = useFetch<BggDetailsResponse>(`https://boardgamegeek.com/xmlapi2/thing?id=${item.bggId}`, {
    execute: !!item,
    parseResponse: (response: Response) => parseGameData(response),
    onError: (error) => {
      console.error(error);
      showFailureToast('Could not fetch game details');
    },
  });

  const markdown = `![](${data?.img})\n\n${data?.description?.split('<br/>')?.join('\n')}`;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={data && markdown}
      metadata={
        data && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Players" text={`${data?.minPlayers} - ${data?.maxPlayers}`} />
            <List.Item.Detail.Metadata.Label title="Average Playtime" text={`${data?.avgPlaytime} Minutes`} />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
}
