import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, List } from '@raycast/api';
import { useCachedPromise, useFetch } from '@raycast/utils';
import { useMemo, useRef, useState } from 'react';
import { endpoint, getProblemQuery, searchPanelQuery, searchProblemQuery } from './api';
import {
  GetProblemResponse,
  PanelSearchResponse,
  Problem,
  ProblemDifficulty,
  ProblemPreview,
  ProblemStats,
  SearchProblemResponse,
} from './types';
import { formatProblemMarkdown, questionListOrThrow } from './utils';
import { useProblemTemplateActions } from './useProblemTemplateActions';
import { ratingTag, useProblemRatings } from './ratings';

const PAGE_SIZE = 30;

type SearchResult = Omit<ProblemPreview, 'stats'> & { acRate?: string };

const PANEL_DIFFICULTY: Record<'EASY' | 'MEDIUM' | 'HARD', ProblemDifficulty> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

async function postGraphQL<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`LeetCode responded with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchSearchPage(searchKeyword: string, categorySlug: string, page: number, signal?: AbortSignal) {
  const skip = page * PAGE_SIZE;

  if (searchKeyword) {
    // questionList with searchKeywords reorders matches between requests, so some
    // repeat across pages and others never show up. The panel query pages in a
    // stable relevance order.
    const result = await postGraphQL<PanelSearchResponse>(
      searchPanelQuery,
      { categorySlug, skip, limit: PAGE_SIZE, searchKeyword, filters: { filterCombineType: 'ALL' } },
      signal,
    );
    const list = result.data?.problemsetPanelQuestionList;
    if (!list) {
      throw new Error(result.errors?.[0]?.message ?? 'LeetCode returned no problem list');
    }
    const data: SearchResult[] = list.questions.map((question) => ({
      difficulty: PANEL_DIFFICULTY[question.difficulty],
      questionFrontendId: question.questionFrontendId,
      isPaidOnly: question.paidOnly,
      title: question.title,
      titleSlug: question.titleSlug,
      acRate: question.acRate == null ? undefined : `${(question.acRate * 100).toFixed(1)}%`,
    }));
    return { data, hasMore: list.hasMore };
  }

  // Without a keyword, list everything in problem order. questionList returns no
  // problems for an empty searchKeywords, so the key is left out.
  const list = questionListOrThrow(
    await postGraphQL<SearchProblemResponse>(
      searchProblemQuery,
      { categorySlug, skip, limit: PAGE_SIZE, filters: {} },
      signal,
    ),
  );
  const data: SearchResult[] = list.data.map(({ stats, ...problem }) => ({
    ...problem,
    acRate: (JSON.parse(stats) as ProblemStats).acRate,
  }));
  return { data, hasMore: skip + PAGE_SIZE < list.total };
}

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

export function ProblemDetail(props: { titleSlug: string }) {
  const { showProblemRatings } = getPreferenceValues<Preferences>();
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
    mapResult(result: GetProblemResponse) {
      return {
        data: result.data.problem,
      };
    },
  });

  const { ratings, isRatingsLoading } = useProblemRatings(showProblemRatings);
  const ratingsLoaded = showProblemRatings && ratings != null;
  const rating = ratingsLoaded ? ratings[props.titleSlug] : undefined;

  const problemMarkdown = useMemo(
    () => formatProblemMarkdown(problem, undefined, rating, ratingsLoaded),
    [problem, rating, ratingsLoaded],
  );

  const actions = useProblemTemplateActions({
    codeSnippets: problem?.codeSnippets,
    problemMarkdown,
    isPaidOnly: problem?.isPaidOnly,
    linkUrl: `https://leetcode.com/problems/${props.titleSlug}`,
  });

  return <Detail isLoading={isProblemLoading || isRatingsLoading} markdown={problemMarkdown} actions={actions} />;
}

export default function Command() {
  const { showProblemStats, showProblemRatings } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const { ratings, isRatingsLoading } = useProblemRatings(showProblemRatings);
  const abortable = useRef<AbortController>(null);

  // The first page is cached per (search text, category), so reopening shows
  // the last results instantly while they revalidate. Later pages load as the
  // user scrolls.
  const {
    isLoading,
    data: problems,
    error,
    pagination,
    revalidate,
  } = useCachedPromise(
    (searchKeyword: string, category: string) =>
      async ({ page }: { page: number }) =>
        fetchSearchPage(searchKeyword, category, page, abortable.current?.signal),
    [searchText.trim(), categorySlug],
    {
      abortable,
      keepPreviousData: true,
      initialData: [],
      failureToastOptions: {
        // The default Retry re-requests only the failed page and drops the pages
        // loaded before it; reload from the first page instead.
        primaryAction: {
          title: 'Reload',
          onAction: (toast) => {
            toast.hide();
            revalidate();
          },
        },
      },
    },
  );

  // List item ids must be unique. Pages can overlap if LeetCode adds a problem
  // while the user scrolls, so keep the first occurrence.
  const uniqueProblems = useMemo(() => {
    const seen = new Set<string>();
    return problems.filter((problem) => {
      if (seen.has(problem.questionFrontendId)) return false;
      seen.add(problem.questionFrontendId);
      return true;
    });
  }, [problems]);

  return (
    <List
      isLoading={isLoading || isRatingsLoading}
      // After a failed page the hook drops the loaded pages but still reports
      // more, so loading on would append to the first page only. Pause paging
      // until Reload starts over.
      pagination={error ? undefined : pagination}
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
      {error && uniqueProblems.length === 0 ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load problems"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView title={isLoading ? 'Loading ...' : 'No results found'} />
      )}
      {uniqueProblems.map((problem) => {
        const ratingsLoaded = showProblemRatings && ratings != null;
        const problemUrl = `https://leetcode.com/problems/${problem.titleSlug}`;
        return (
          <List.Item
            key={problem.questionFrontendId}
            id={problem.questionFrontendId}
            title={`${problem.questionFrontendId}. ${problem.title}`}
            subtitle={showProblemStats ? problem.acRate : undefined}
            accessories={[
              ...(problem.isPaidOnly ? [{ icon: Icon.Lock }] : []),
              ...(ratingsLoaded ? [{ tag: ratingTag(ratings[problem.titleSlug]), tooltip: 'Zerotrac rating' }] : []),
              ...(showProblemStats
                ? [{ tag: { color: formatDifficultyColor(problem.difficulty), value: problem.difficulty } }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Preview Problem"
                  icon={Icon.Eye}
                  target={<ProblemDetail titleSlug={problem.titleSlug} />}
                />
                <Action.OpenInBrowser title="Open in Browser" url={problemUrl} />
                <Action.CopyToClipboard title="Copy Link to Clipboard" content={problemUrl} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
