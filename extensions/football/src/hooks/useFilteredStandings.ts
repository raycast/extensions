import { useState, useEffect } from 'react';
import { Competition, Standing } from '../shared/types';
import { useStandings } from './useFootballData';

export const useFilteredStandings = (compotition: Competition | undefined) => {
  const [standings, loadingStandings] = useStandings(compotition);
  const [filteredStandings, setFilteredStandings] = useState<Standing[]>([]);

  useEffect(() => {
    if (standings) {
      const [firstStanding] = standings;
      if (!firstStanding.group) {
        setFilteredStandings([firstStanding]);
        return;
      }

      setFilteredStandings(standings);
    }
  }, [standings]);

  return [filteredStandings, loadingStandings] as const;
};
