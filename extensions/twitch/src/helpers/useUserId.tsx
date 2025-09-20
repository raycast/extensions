import { useTwitchRequest } from "./useTwitchRequest";

type User = {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
};

export function useUserId() {
  const { data, isLoading } = useTwitchRequest<User | undefined>({
    url: `https://api.twitch.tv/helix/users`,
    initialData: undefined,
    select: (data) => data.data[0],
  });
  return {
    data: data?.id,
    isLoading: data?.id ? false : isLoading,
  };
}
