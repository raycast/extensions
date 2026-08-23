import { gql } from "./client";
import type { Channel, PinterestBoard } from "./types";

const GET_CHANNELS = `
  query GetChannels($input: ChannelsInput!) {
    channels(input: $input) {
      id
      name
      service
      type
      isLocked
      isDisconnected
    }
  }
`;

export async function getChannels(organizationId: string): Promise<Channel[]> {
  const data = await gql<{ channels: Channel[] }>(GET_CHANNELS, {
    input: {
      organizationId,
      filter: {
        isLocked: false,
      },
    },
  });
  return data.channels;
}

const GET_PINTEREST_BOARDS = `
  query GetPinterestBoards($input: ChannelInput!) {
    channel(input: $input) {
      metadata {
        ... on PinterestMetadata {
          boards {
            serviceId
            name
          }
        }
      }
    }
  }
`;

export async function getPinterestBoards(
  channelId: string,
): Promise<PinterestBoard[]> {
  const data = await gql<{
    channel?: { metadata?: { boards?: PinterestBoard[] } };
  }>(GET_PINTEREST_BOARDS, { input: { id: channelId } });
  return data.channel?.metadata?.boards ?? [];
}
