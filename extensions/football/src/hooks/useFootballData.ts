import { LocalStorage } from '@raycast/api';
import axios from 'axios';
import differenceInMinutes from 'date-fns/differenceInMinutes';
import { useEffect, useState } from 'react';
import { getPreferences } from '../shared/preferences';
import { Competition, Match, Standing, Team } from '../shared/types';
import get from 'lodash/get';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/';

interface CachedQuery<T> {
  data: T;
  lastUpdated: Date;
  query: string;
}

const useFootballDataQuery = <T>(query: string | undefined, key: string, ttl: number) => {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const preferences = getPreferences();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!query) return;

        const cache = await LocalStorage.getItem<string>(query);
        if (cache) {
          const cachedQuery = JSON.parse(cache) as CachedQuery<T>;
          if (differenceInMinutes(new Date(), new Date(cachedQuery.lastUpdated)) < ttl) {
            console.debug(`Using cached query for ${query}`);
            setData(cachedQuery.data);
            setLoading(false);
            return;
          }
        }

        console.debug(`Fetching ${FOOTBALL_DATA_BASE_URL}${query}`);
        setLoading(true);
        const result = await axios(`${FOOTBALL_DATA_BASE_URL}${query}`, {
          headers: { 'X-Auth-Token': preferences.apiKey },
        });

        console.debug(`Caching ${query}`);
        console.log(result.data);
        const data = get(result.data, key);
        const queryToChache: CachedQuery<T> = {
          data,
          lastUpdated: new Date(),
          query,
        };
        await LocalStorage.setItem(query, JSON.stringify(queryToChache));

        setData(data);
        setLoading(false);
      } catch (error) {
        setError(error as Error);
        console.error(error);
        setLoading(false);
      }
    };

    fetchData();
  }, [query, key, ttl]);

  return [data, loading, error] as const;
};

export const useCompetitions = () => useFootballDataQuery<Competition[]>('/v4/competitions', 'competitions', 1440);

export const useMatches = (team: Team | undefined) =>
  useFootballDataQuery<Match[]>(team && `/v4/teams/${team.id}/matches`, 'matches', 3);

export const useStandings = (competition: Competition | undefined) =>
  useFootballDataQuery<Standing[]>(competition && `/v4/competitions/${competition.code}/standings`, 'standings', 720);

export const useCompetitionMatches = (competition: Competition | undefined) =>
  useFootballDataQuery<Match[]>(
    competition && `/v4/competitions/${competition?.code}/matches?status=SCHEDULED`,
    'matches',
    3
  );
