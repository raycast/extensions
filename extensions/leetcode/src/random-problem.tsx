import { Action, ActionPanel, Color, Detail, Form, getPreferenceValues, Icon, useNavigation } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useMemo, useState } from 'react';
import { endpoint, searchProblemQuery } from './api';
import { ProblemDetail } from './problem-search';
import { ratingTag, useProblemRatings } from './ratings';
import { ProblemDifficulty, ProblemPreview, ProblemStats, SearchProblemResponse } from './types';

// Size of the random window we fetch, then pick one item from. Keeps premium
// filtering client-side without downloading the full problem set.
const BATCH_SIZE = 50;

// Common LeetCode topic-tag slugs. filters.tags expects these slugs, not names.
const TOPIC_TAGS: { slug: string; name: string }[] = [
  { slug: 'array', name: 'Array' },
  { slug: 'string', name: 'String' },
  { slug: 'hash-table', name: 'Hash Table' },
  { slug: 'dynamic-programming', name: 'Dynamic Programming' },
  { slug: 'math', name: 'Math' },
  { slug: 'sorting', name: 'Sorting' },
  { slug: 'greedy', name: 'Greedy' },
  { slug: 'depth-first-search', name: 'Depth-First Search' },
  { slug: 'breadth-first-search', name: 'Breadth-First Search' },
  { slug: 'binary-search', name: 'Binary Search' },
  { slug: 'tree', name: 'Tree' },
  { slug: 'binary-tree', name: 'Binary Tree' },
  { slug: 'two-pointers', name: 'Two Pointers' },
  { slug: 'bit-manipulation', name: 'Bit Manipulation' },
  { slug: 'stack', name: 'Stack' },
  { slug: 'heap-priority-queue', name: 'Heap (Priority Queue)' },
  { slug: 'graph', name: 'Graph' },
  { slug: 'backtracking', name: 'Backtracking' },
  { slug: 'sliding-window', name: 'Sliding Window' },
  { slug: 'linked-list', name: 'Linked List' },
  { slug: 'matrix', name: 'Matrix' },
  { slug: 'prefix-sum', name: 'Prefix Sum' },
  { slug: 'trie', name: 'Trie' },
  { slug: 'union-find', name: 'Union Find' },
];

function difficultyColor(difficulty: ProblemDifficulty): Color {
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

type Filters = {
  categorySlug: string;
  difficulty: string; // '' | 'EASY' | 'MEDIUM' | 'HARD'
  tags: string[];
  excludePremium: boolean;
};

function buildFilterInput(filters: Filters): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (filters.difficulty) input.difficulty = filters.difficulty;
  if (filters.tags.length) input.tags = filters.tags;
  return input;
}

function RandomResult(props: { filters: Filters }) {
  const { filters } = props;
  const { push } = useNavigation();
  const [roll, setRoll] = useState(0);
  const { showProblemRatings } = getPreferenceValues<Preferences>();
  const { ratings } = useProblemRatings(showProblemRatings);

  const filterInput = useMemo(() => buildFilterInput(filters), [filters]);

  // Step 1: total number of problems matching the filters.
  const { isLoading: isTotalLoading, data: total } = useFetch<SearchProblemResponse, undefined, number>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: searchProblemQuery,
      variables: { categorySlug: filters.categorySlug, skip: 0, limit: 1, filters: filterInput },
    }),
    headers: { 'Content-Type': 'application/json' },
    mapResult(result: SearchProblemResponse) {
      return { data: result.data.problemsetQuestionList?.total ?? 0 };
    },
    keepPreviousData: false,
  });

  // Random window start, re-computed on each roll.
  const skip = useMemo(() => {
    if (!total || total <= 0) return 0;
    const maxStart = Math.max(0, total - BATCH_SIZE);
    return Math.floor(Math.random() * (maxStart + 1));
  }, [total, roll]);

  // Step 2: fetch the random window.
  const { isLoading: isBatchLoading, data: batch } = useFetch<SearchProblemResponse, undefined, ProblemPreview[]>(
    endpoint,
    {
      method: 'POST',
      body: JSON.stringify({
        query: searchProblemQuery,
        variables: { categorySlug: filters.categorySlug, skip, limit: BATCH_SIZE, filters: filterInput },
      }),
      headers: { 'Content-Type': 'application/json' },
      mapResult(result: SearchProblemResponse) {
        return { data: result.data.problemsetQuestionList?.data ?? [] };
      },
      execute: total !== undefined && total > 0,
      keepPreviousData: false,
    },
  );

  // Pick one problem from the window. When excluding premium we never fall back
  // to the unfiltered batch — an all-premium window yields no pick (re-roll).
  const picked = useMemo(() => {
    if (!batch || batch.length === 0) return undefined;
    const pool = filters.excludePremium ? batch.filter((p) => !p.isPaidOnly) : batch;
    if (pool.length === 0) return undefined;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [batch, filters.excludePremium, roll]);

  const isLoading = isTotalLoading || isBatchLoading;

  if (!isLoading && (total === 0 || (batch && batch.length === 0))) {
    return <Detail markdown={'# No matches\n\nNo problems match these filters. Try loosening them.'} />;
  }

  if (!picked) {
    // Not loading + a non-empty batch means the whole window was premium.
    const allPremium = !isLoading && !!batch && batch.length > 0;
    return (
      <Detail
        isLoading={isLoading}
        navigationTitle="Random LeetCode Problem"
        markdown={
          allPremium
            ? '# Only premium here\n\nEvery problem in this random window is premium. Pick another to try a different set.'
            : '# Rolling…'
        }
        actions={
          allPremium ? (
            <ActionPanel>
              <Action title="Pick Another" icon={Icon.Shuffle} onAction={() => setRoll((r) => r + 1)} />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }

  const acRate = (() => {
    try {
      return (JSON.parse(picked.stats) as ProblemStats).acRate;
    } catch {
      return undefined;
    }
  })();

  const ratingsLoaded = showProblemRatings && ratings != null;

  const url = `https://leetcode.com/problems/${picked.titleSlug}/`;
  const markdown = [
    `# ${picked.questionFrontendId}. ${picked.title}`,
    picked.isPaidOnly ? '\n> 🔒 Premium problem' : '',
    '',
    `Press **Preview Full Problem** to read the description, or **Pick Another** to re-roll.`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Random LeetCode Problem"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Difficulty">
            <Detail.Metadata.TagList.Item text={picked.difficulty} color={difficultyColor(picked.difficulty)} />
          </Detail.Metadata.TagList>
          {ratingsLoaded ? (
            <Detail.Metadata.TagList title="Rating">
              <Detail.Metadata.TagList.Item
                text={ratingTag(ratings[picked.titleSlug]).value}
                color={ratingTag(ratings[picked.titleSlug]).color}
              />
            </Detail.Metadata.TagList>
          ) : null}
          {acRate ? <Detail.Metadata.Label title="Acceptance" text={acRate} /> : null}
          <Detail.Metadata.Label title="Premium" text={picked.isPaidOnly ? 'Yes' : 'No'} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Preview Full Problem"
            icon={Icon.Eye}
            onAction={() => push(<ProblemDetail titleSlug={picked.titleSlug} />)}
          />
          <Action title="Pick Another" icon={Icon.Shuffle} onAction={() => setRoll((r) => r + 1)} />
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy Link" content={url} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();

  function onSubmit(values: { categorySlug: string; difficulty: string; tags: string[]; excludePremium: boolean }) {
    push(<RandomResult filters={values} />);
  }

  return (
    <Form
      navigationTitle="Pick a Random Problem"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Pick Random Problem" icon={Icon.Shuffle} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="difficulty" title="Difficulty" storeValue>
        <Form.Dropdown.Item value="" title="Any" />
        <Form.Dropdown.Item value="EASY" title="Easy" />
        <Form.Dropdown.Item value="MEDIUM" title="Medium" />
        <Form.Dropdown.Item value="HARD" title="Hard" />
      </Form.Dropdown>

      <Form.Dropdown id="categorySlug" title="Category" storeValue>
        <Form.Dropdown.Item value="" title="All" />
        <Form.Dropdown.Item value="algorithms" title="Algorithms" />
        <Form.Dropdown.Item value="database" title="Database" />
        <Form.Dropdown.Item value="shell" title="Shell" />
        <Form.Dropdown.Item value="concurrency" title="Concurrency" />
        <Form.Dropdown.Item value="javascript" title="JavaScript" />
        <Form.Dropdown.Item value="pandas" title="pandas" />
      </Form.Dropdown>

      <Form.TagPicker id="tags" title="Topic Tags" storeValue>
        {TOPIC_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.slug} value={tag.slug} title={tag.name} />
        ))}
      </Form.TagPicker>

      <Form.Checkbox id="excludePremium" title="Premium" label="Exclude premium (paid-only) problems" storeValue />
    </Form>
  );
}
