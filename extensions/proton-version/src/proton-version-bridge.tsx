import { List } from "@raycast/api";
import ListItem from "./Components/BridgeListItem";
import useFetchBridge from "./Components/useFetchBridge";

const ProtonVersion = () => {
  const { isLoading, macOSFetch, windowsFetch, linuxFetch } = useFetchBridge();

  return (
    <List isLoading={isLoading}>
      <ListItem os="macos" data={macOSFetch.data} />
      <ListItem os="windows" data={windowsFetch.data} />
      <ListItem os="linux" data={linuxFetch.data} />
    </List>
  );
};

export default ProtonVersion;
