import { ChannelDetails } from "../interfaces/ChannelDetails";
import { useTwitchRequest } from "./useTwitchRequest";

export default function useChannelDetails(channelId: string | undefined) {
  const {
    data: [data],
    isLoading,
    updatedAt,
  } = useTwitchRequest<Partial<ChannelDetails>[]>({
    url: `https://api.twitch.tv/helix/channels?broadcaster_id=${channelId}`,
    initialData: [{}] as Partial<ChannelDetails>[],
    enabled: Boolean(channelId),
  });
  return {
    isLoading,
    updatedAt,
    data,
  };
}
