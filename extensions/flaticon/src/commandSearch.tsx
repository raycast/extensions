import { getPreferenceValues, Grid } from '@raycast/api';
import onAuth from './hooks/onAuth';
import onSearchIcons from './hooks/onSearchIcons';
import { useState } from 'react';
import EmptyView from './components/EmptyView';
import NotFoundView from './components/NotFoundView';
import IconItem from './components/IconItem';
import { FlatIcon } from './entities/FlatIcon';
import ErrorView from './components/ErrorView';

const { apiKey } = getPreferenceValues();

// noinspection JSUnusedGlobalSymbols
export default () => {
  const [search, setSearch] = useState('');
  const auth = onAuth(apiKey);
  const results = onSearchIcons(auth.token, search);

  const isLoading = auth.isLoading || results.isLoading;
  const list = results.data?.list || [];

  return (
    <Grid isLoading={isLoading} onSearchTextChange={setSearch} inset={Grid.Inset.Medium} columns={8} throttle>
      {displayResults({ search, list, error: auth.error })}
    </Grid>
  );
};

const displayResults = ({ search, list, error }: { search: string; list: FlatIcon[]; error?: Error }) => {
  if (error) return [<ErrorView key="error" title={error.name} description={error.message} />];
  if (search.length === 0) return [<EmptyView key="empty" />];
  if (list.length === 0) return [<NotFoundView key="not-found" />];

  return list.map(icon => <IconItem key={icon.id} icon={icon} />);
};
