import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Channel, DirectMessage, Team, User } from "./models/user";
import { getDirectMessageList, getDirectoryList, getCurrentUser, getUserList } from "./actions/rocketchat-api";
import { TeamSection } from "./components/teamSection";
import { ChannelSection } from "./components/channelSection";
import { DirectMessageSection } from "./components/directMessageSection";
import { UserSection } from "./components/userSection";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setFilteredTeams([]);
      setFilteredChannels([]);
      setFilteredUsers([]);
      setDirectMessages([]);

      if (searchText != "") {
        setFilteredTeams(teams.filter((team) => team.name.toLowerCase().includes(searchText.toLowerCase())));

        setFilteredChannels(
          channels.filter((channel) => channel.name.toLowerCase().includes(searchText.toLowerCase())),
        );

        setFilteredUsers(
          users.filter((user) => user.active && user.nameInsensitive.includes(searchText.toLowerCase())),
        );
        setIsLoading(false);

        return;
      }

      try {
        const [currentUser, fetchedTeams, fetchedChannels, fetchedMessages, fetchedUsers] = await Promise.all([
          getCurrentUser(),
          getDirectoryList("teams"),
          getDirectoryList("channels"),
          getDirectMessageList(),
          getUserList(),
        ]);

        for (const message of fetchedMessages) {
          // If the user chatted with himself, then do not filter out his username
          const usernames =
            message.usernames.length <= 1
              ? message.usernames
              : message.usernames.filter((username) => username !== currentUser.username);

          message.involvedUsers = usernames
            .map((username) => {
              return fetchedUsers.find((user) => user.username === username);
            })
            .filter((user): user is User => Boolean(user));
          message.isGroupChat = message.involvedUsers.length >= 2;
        }

        setTeams(fetchedTeams);
        setChannels(fetchedChannels);
        setUsers(fetchedUsers);
        setDirectMessages(fetchedMessages);
        setIsLoading(false);
      } catch (e) {
        setTeams([]);
        setChannels([]);
        setUsers([]);
        setDirectMessages([]);
        setIsLoading(false);
      }
    })();
  }, [searchText]);

  return (
    <List filtering={false} onSearchTextChange={setSearchText} throttle={true} isLoading={isLoading}>
      <TeamSection teams={searchText !== "" ? filteredTeams : teams} />
      <ChannelSection channels={searchText !== "" ? filteredChannels : channels} />
      {searchText !== "" ? (
        <UserSection users={filteredUsers} />
      ) : (
        <DirectMessageSection directMessages={directMessages} />
      )}
    </List>
  );
}
