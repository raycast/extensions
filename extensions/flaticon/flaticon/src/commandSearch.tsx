import {getPreferenceValues, Grid} from "@raycast/api";
import onAuth from "./hooks/onAuth";
import onSearchIcons from "./hooks/onSearchIcons";
import {useState} from "react";
import EmptyView from "./components/EmptyView";
import NotFoundView from "./components/NotFoundView";
import IconItem from "./components/IconItem";
import {FlatIcon} from "./entities/FlatIcon";

const {apiKey} = getPreferenceValues();

// noinspection JSUnusedGlobalSymbols
export default () => {
  const [search, setSearch] = useState("");
  const auth = onAuth(apiKey);
  const results = onSearchIcons(auth.token, search);

  const isLoading = auth.isLoading || results.isLoading;
  const list = results.data || [];

  return <Grid isLoading={isLoading} onSearchTextChange={setSearch} throttle>
    {displayResults({search, list})}
  </Grid>
}

const displayResults = ({search, list}: { search: string; list: FlatIcon[] }) => {
  if (search.length === 0) return [<EmptyView key="empty"/>];
  if (list.length === 0) return [<NotFoundView key="not-found"/>];

  return list.map(icon => <IconItem key={icon.id} icon={icon}/>);
}
