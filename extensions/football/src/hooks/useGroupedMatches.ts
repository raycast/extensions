import { isPast, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import { Match } from '../shared/types';

interface GroupedMatches {
  pastMatches: Match[];
  upcomingMatches: Match[];
}

export const useGroupedMatches = (matches: Match[] | undefined) => {
  const [groupedMatches, setGroupedMatches] = useState<GroupedMatches>({
    pastMatches: [],
    upcomingMatches: [],
  });

  useEffect(() => {
    if (matches) {
      const groupedMatches = matches.reduce(
        (acc, match) => {
          if (isPast(parseISO(match.utcDate))) {
            acc.pastMatches.push(match);
          } else {
            acc.upcomingMatches.push(match);
          }
          return acc;
        },
        { pastMatches: [], upcomingMatches: [] } as GroupedMatches
      );
      setGroupedMatches(groupedMatches);
    }
  }, [matches]);

  return groupedMatches;
};
