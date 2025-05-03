import { List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import PlayerComponent from "../components/Player";
import useProfile from "../hooks/useProfile";

type PropTypes = {
  username: string;
};

const UserProfile = ({ username }: PropTypes) => {
  const preferences = getPreferenceValues<Preferences.ViewProfile>();
  const [searchText, setSearchText] = useState(username || preferences.username);
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const { data, isLoading } = useProfile(searchText);

  useEffect(() => {
    if (!isLoading) {
      setIsShowingDetail(data ? true : false);
    }
  }, [isLoading, data]);

  useEffect(() => {
    setIsShowingDetail(false);
  }, [searchText]);

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by username"
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      throttle
    >
      {!isLoading && data ? (
        <PlayerComponent
          key={data.id}
          player={data}
          setIsShowingDetail={setIsShowingDetail}
          isShowingDetail={isShowingDetail}
        />
      ) : (
        <List.EmptyView
          icon="logo.png"
          title={searchText ? `No player found with username ${searchText}` : "Please enter a username"}
        />
      )}
    </List>
  );
};

export default UserProfile;
