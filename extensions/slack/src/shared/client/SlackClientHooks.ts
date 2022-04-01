import useSWR from "swr";

import { Channel, Group, SlackClient, User } from "./SlackClient";

export const useUsers = () => useSWR<User[]>("users", SlackClient.getUsers);
export const useChannels = () => useSWR<Channel[]>("channels", SlackClient.getChannels);
export const useGroups = () => useSWR<Group[]>("group-chats", SlackClient.getGroups);
