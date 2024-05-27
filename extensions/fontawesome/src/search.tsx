import { useState } from 'react';
import { List, Grid, Color } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { SearchResult } from './types';
import svgToMiniDataURI from 'mini-svg-data-uri';

const iconQuery = (squery: string) => `
query Search {
  search(query:"${squery}", version: "6.5.2", first: 30) {
      id
      label
      unicode
      svgs {
          height
          html
          iconDefinition
          pathData
          width
      }
  }
}
`;

export default function Command() {
  const [query, setQuery] = useState<string>('');

  const { isLoading, data } = useFetch<SearchResult>('https://api.fontawesome.com', {
    keepPreviousData: true,
    method: 'POST',
    body: iconQuery(query),
    // onData: saveSVGs,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJGb250YXdlc29tZSIsImV4cCI6MTcxNjc5NTk4MSwiaWF0IjoxNzE2NzkyMzgxLCJpc3MiOiJGb250YXdlc29tZSIsImp0aSI6ImY2Y2Q0YmZkLWE5ZjctNGRiYi04ZDQ3LTJmM2RhYWQ4YWM0ZSIsIm5iZiI6MTcxNjc5MjM4MCwic3ViIjoiVG9rZW46MjA1Mzc5OSIsInR5cCI6ImFjY2VzcyJ9.l2evogW9GPjD8QMRQkP7EOrLFS_rKRKwkwnbFTRPQzEGt54iLGzLpZXjd74FuRSGk6h65PgF7Kc-REEy8dZ3ew`,
    },
  });

  return (
    <Grid isLoading={isLoading} searchText={query} onSearchTextChange={setQuery}>
      {data?.data.search.map((searchItem) => (
        <Grid.Item
          title={searchItem.id}
          key={searchItem.id}
          content={{
            source: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>`,
          }}
        />
      ))}
    </Grid>
  );
}
