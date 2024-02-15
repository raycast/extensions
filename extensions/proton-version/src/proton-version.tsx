import { List } from "@raycast/api";
import ListItem from "./Components/WebListItem";
import useFetchWeb from "./Components/useFetchWeb";

const ProtonVersion = () => {
  const { isLoading, mailFetch, calendarFetch, driveFetch, accountFetch } = useFetchWeb("default");

  return (
    <List isLoading={isLoading}>
      <ListItem environment="default" product="proton-mail" data={mailFetch.data} />
      <ListItem environment="default" product="proton-calendar" data={calendarFetch.data} />
      <ListItem environment="default" product="proton-drive" data={driveFetch.data} />
      <ListItem environment="default" product="proton-account" data={accountFetch.data} />
    </List>
  );
};

export default ProtonVersion;
