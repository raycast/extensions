import { Action, ActionPanel, Detail, Grid, Icon } from '@raycast/api';
import { formatRelative } from 'date-fns';
import { useState } from 'react';
import { useFetch } from '@raycast/utils';

import { ENDPOINT, DEFAULT_QUERY, SEARCH_QUERY } from './queries';

import type { Media, Result } from './types';

export default function SearchAnimeGrid() {
  const [searchText, setSearchText] = useState('');

  const { data, isLoading } = useFetch<Result>(ENDPOINT, {
    body: JSON.stringify({
      query: searchText ? SEARCH_QUERY : DEFAULT_QUERY,
      variables: {
        page: 1,
        perPage: 50,
        search: searchText,
      },
    }),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    method: 'POST',
    keepPreviousData: true,
  });

  return (
    <Grid
      columns={5}
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search anime..."
      searchText={searchText}
      throttle
    >
      {!isLoading &&
        (
          data?.data?.Page.media.filter(
            (media: Media) =>
              media.status === 'NOT_YET_RELEASED' ||
              media.status === 'RELEASING',
          ) || []
        ).map((anime: Media) => {
          const { id, coverImage, status, title } = anime;
          return (
            <Grid.Item
              key={id}
              content={coverImage?.extraLarge}
              subtitle={
                status === 'RELEASING' ? 'Currently airing' : 'Not yet airing'
              }
              title={title.english ?? title.romaji}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="More info"
                    icon={Icon.Info}
                    target={<MoreInfo anime={anime} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}

function MoreInfo({ anime }: { anime: Media }) {
  const {
    description,
    externalLinks,
    nextAiringEpisode,
    siteUrl,
    status,
    title,
  } = anime;

  let cleanDescription = (description || '')
    .replaceAll('<br>', '\n')
    .replaceAll('<b>', '__')
    .replaceAll('</b>', '__')
    .replaceAll('<i>', '_')
    .replaceAll('</i>', '_')
    .substring(0, 250);

  cleanDescription = `${cleanDescription}...[Read more](${siteUrl})`;

  if (!description) {
    cleanDescription = 'No description';
  }

  const markdown = `
  ## Description

  ${cleanDescription}
  `;

  return (
    <Detail
      actions={
        <ActionPanel>
          {externalLinks
            .filter(link => link.type === 'STREAMING')
            .map(link => {
              return (
                <Action.OpenInBrowser
                  key={link.id}
                  title={`Watch on ${link.site}`}
                  url={link.url}
                />
              );
            })}
        </ActionPanel>
      }
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Title"
            text={title.english ?? title.romaji}
          />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={
                status === 'RELEASING' ? 'Currently airing' : 'Not yet airing'
              }
              color={status === 'RELEASING' ? '#a9ed34' : '#eed535'}
            />
          </Detail.Metadata.TagList>
          {nextAiringEpisode && (
            <Detail.Metadata.Label
              title="Next episode"
              text={formatRelative(
                new Date(nextAiringEpisode?.airingAt * 1000),
                new Date(),
              )}
            />
          )}
        </Detail.Metadata>
      }
      navigationTitle={title.english ?? title.romaji}
    />
  );
}
