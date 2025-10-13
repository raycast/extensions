import { Action, ActionPanel, Color, Detail, Icon, List } from '@raycast/api';
import { useCachedState, useFetch } from '@raycast/utils';
import { useMemo, useState } from 'react';
import { endpoint, getProblemQuery, searchProblemQuery } from './api';
import { GetProblemResponse, Problem, ProblemDifficulty, ProblemPreview, SearchProblemResponse } from './types';
import { formatProblemMarkdown } from './utils';
import { useProblemTemplateActions } from './useProblemTemplateActions';

function formatDifficultyColor(difficulty: ProblemDifficulty): Color {
  switch (difficulty) {
    case 'Easy':
      return Color.Green;
    case 'Medium':
      return Color.Orange;
    case 'Hard':
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}

function ProblemDetail(props: { titleSlug: string }): JSX.Element {
  const { isLoading: isProblemLoading, data: problem } = useFetch<GetProblemResponse, undefined, Problem>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: getProblemQuery,
      variables: {
        titleSlug: props.titleSlug,
      },
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    mapResult(result) {
      return {
        data: result.data.problem,
      };
    },
  });

  const problemMarkdown = useMemo(() => formatProblemMarkdown(problem), [problem]);

  const actions = useProblemTemplateActions({
    codeSnippets: problem?.codeSnippets,
    problemMarkdown,
    isPaidOnly: problem?.isPaidOnly,
    linkUrl: `https://leetcode.com/problems/${props.titleSlug}`,
  });

  return <Detail isLoading={isProblemLoading} markdown={problemMarkdown} actions={actions} />;
}

export default function Command(): JSX.Element {
  const [searchText, setSearchText] = useState<string>('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [problems, setProblems] = useCachedState<ProblemPreview[]>('searched-problems', []);

  const { isLoading } = useFetch<SearchProblemResponse, undefined, ProblemPreview[]>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: searchProblemQuery,
      variables: {
        categorySlug,
        skip: 0,
        limit: 30,
        filters: {
          searchKeywords: searchText,
        },
      },
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    mapResult(result) {
      return {
        data: result.data.problemsetQuestionList?.data || [],
      };
    },
    onData: (data) => {
      setProblems(data);
    },
    execute: searchText !== '' || problems.length === 0,
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search LeetCode Problems"
      searchBarPlaceholder="Search LeetCode problems"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          storeValue={true}
          onChange={(value) => {
            setCategorySlug(value);
          }}
        >
          <List.Dropdown.Item icon="categories/all.svg" value="" title="All" />
          <List.Dropdown.Item
            icon={{ source: 'categories/algorithms.svg', tintColor: Color.Orange }}
            value="algorithms"
            title="Algorithms"
          />
          <List.Dropdown.Item
            icon={{ source: 'categories/database.svg', tintColor: Color.Blue }}
            value="database"
            title="Database"
          />
          <List.Dropdown.Item
            icon={{ source: 'categories/shell.svg', tintColor: Color.Green }}
            value="shell"
            title="Shell"
          />
          <List.Dropdown.Item
            icon={{ source: 'categories/concurrency.svg', tintColor: Color.Magenta }}
            value="concurrency"
            title="Concurrency"
          />
          <List.Dropdown.Item
            icon={{ source: 'categories/javascript.svg', tintColor: '#64d2ff' }}
            value="javascript"
            title="JavaScript"
          />
          <List.Dropdown.Item
            icon={{ source: 'categories/pandas.svg', tintColor: Color.Purple }}
            value="pandas"
            title="pandas"
          />
        </List.Dropdown>
      }
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      <List.EmptyView title={isLoading ? 'Loading ...' : 'No results found'} />
      {problems.map((problem) => (
        <List.Item
          key={problem.questionFrontendId}
          id={problem.questionFrontendId}
          title={`${problem.questionFrontendId}. ${problem.title}`}
          subtitle={JSON.parse(problem.stats).acRate}
          accessories={[
            ...(problem.isPaidOnly ? [{ icon: Icon.Lock }] : []),
            { tag: { color: formatDifficultyColor(problem.difficulty), value: problem.difficulty } },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Preview Problem"
                icon={Icon.Eye}
                target={<ProblemDetail titleSlug={problem.titleSlug} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
