import { List } from "@raycast/api";
import ListItem from "./Components/WebListItem";
import useFetchWeb from "./Components/useFetchWeb";

const ProtonVersion = () => {
  const { isLoading, mailFetch, calendarFetch, driveFetch, accountFetch } = useFetchWeb("beta");

  return (
    <List isLoading={isLoading}>
      <ListItem environment="beta" product="proton-mail" data={mailFetch.data} />
      <ListItem environment="beta" product="proton-calendar" data={calendarFetch.data} />
      <ListItem environment="beta" product="proton-drive" data={driveFetch.data} />
      <ListItem environment="beta" product="proton-account" data={accountFetch.data} />
    </List>
  );
};

export default ProtonVersion;
