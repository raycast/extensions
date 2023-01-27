import { Action, ActionPanel, Color, Detail, Icon, List } from '@raycast/api';
import { useCachedState, useFetch } from '@raycast/utils';
import { useEffect, useState } from 'react';
import { endpoint, getProblemQuery, searchProblemQuery } from './api';
import { GetProblemResponse, Problem, ProblemDifficulty, ProblemPreview, SearchProblemResponse } from './types';
import { formatProblemMarkdown } from './utils';

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
  const [problem, setProblem] = useState<Problem | undefined>(undefined);

  const { isLoading } = useFetch<GetProblemResponse>(endpoint, {
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
    onData: (data) => {
      setProblem(data.data.problem);
    },
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={formatProblemMarkdown(problem)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={`https://leetcode.com/problems/${props.titleSlug}`} />
          <Action.CopyToClipboard
            title="Copy Link to Clipboard"
            content={`https://leetcode.com/problems/${props.titleSlug}`}
          />
        </ActionPanel>
      }
    ></Detail>
  );
}

export default function Command(): JSX.Element {
  const [searchText, setSearchText] = useState<string>('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [problems, setProblems] = useCachedState<ProblemPreview[]>('searched-problems', []);
  const [canExecute, setCanExecute] = useState<boolean>(false);

  const { isLoading } = useFetch<SearchProblemResponse>(endpoint, {
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
    onWillExecute: () => {
      setCanExecute(false);
    },
    onData: (data) => {
      if (!data.data.problemsetQuestionList) {
        setProblems([]);
        return;
      }

      setProblems(data.data.problemsetQuestionList.problems);
    },
    execute: canExecute,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (searchText !== '' || problems.length === 0) {
      setCanExecute(true);
    }
  }, [searchText, categorySlug]);

  return (
    <List
      navigationTitle="Search LeetCode Problems"
      searchBarPlaceholder="Search LeetCode problems "
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          storeValue={true}
          onChange={(value) => {
            setCategorySlug(value);
          }}
        >
          <List.Dropdown.Item value="" title="All" />
          <List.Dropdown.Item value="algorithms" title="Algorithms" />
          <List.Dropdown.Item value="database" title="Database" />
          <List.Dropdown.Item value="shell" title="Shell" />
          <List.Dropdown.Item value="concurrency" title="Concurrency" />
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
