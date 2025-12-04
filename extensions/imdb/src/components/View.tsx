import { LaunchProps as RaycastLaunchProps } from '@raycast/api';
import { useMemo, useState } from 'react';
import { useFetch } from '@raycast/utils';
import { List } from './List';
import {
  ListEndpointType,
  getListEndpoint,
  parseListResponse,
} from '../data/fetchList';
import { usePreferences } from '../hooks/usePreferences';

interface LaunchArguments {
  search: string;
}
export type LaunchProps = RaycastLaunchProps<{ arguments: LaunchArguments }>;

type ViewProps = LaunchProps & {
  type?: ListEndpointType;
  showType?: boolean;
  includeGames: boolean;
};
export const View = (props: ViewProps) => {
  const { token } = usePreferences();
  const [search, setSearch] = useState<string>(props.arguments.search || '');
  const parseResponse = useMemo(
    () => parseListResponse(props.includeGames),
    [props.includeGames],
  );

  const { data, isLoading } = useFetch(
    getListEndpoint(search, token, props.type),
    {
      execute: search !== '',
      keepPreviousData: true,
      parseResponse,
    },
  );

  return (
    <List
      data={data}
      isLoading={isLoading}
      onSearch={setSearch}
      search={search}
      showType={props.showType}
    />
  );
};
