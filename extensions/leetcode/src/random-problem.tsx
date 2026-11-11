import { Action, ActionPanel, Color, Detail, Form, getPreferenceValues, Icon, useNavigation } from '@raycast/api';
import { useCachedState, useFetch } from '@raycast/utils';
import { useEffect, useMemo, useState } from 'react';
import { endpoint, getProblemQuery, searchProblemQuery } from './api';
import { ProblemDetail } from './problem-search';
import { ratingTag, useProblemRatings } from './ratings';
import {
  GetProblemResponse,
  Problem,
  ProblemDifficulty,
  ProblemPreview,
  ProblemStats,
  SearchProblemResponse,
} from './types';
import { problemContentMarkdown, questionListOrThrow } from './utils';

// LeetCode serves the problem list in fixed pages: it rounds `skip` down to a
// multiple of `limit`. So we fetch the whole page that holds the random pick.
const PAGE_SIZE = 50;

type Page = { skip: number; problems: ProblemPreview[] };

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
  const { showProblemRatings, showTopicTags } = getPreferenceValues<Preferences>();
  const { ratings } = useProblemRatings(showProblemRatings);

  const filterInput = useMemo(() => buildFilterInput(filters), [filters]);

  // Step 1: number of problems matching the filters.
  const {
    isLoading: isTotalLoading,
    data: total,
    error: totalError,
  } = useFetch<SearchProblemResponse, undefined, number>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: searchProblemQuery,
      variables: { categorySlug: filters.categorySlug, skip: 0, limit: 1, filters: filterInput },
    }),
    headers: { 'Content-Type': 'application/json' },
    mapResult(result: SearchProblemResponse) {
      return { data: questionListOrThrow(result).total };
    },
    keepPreviousData: false,
  });

  // Step 1b: how many of those are premium, so an all-premium result is reported
  // up front instead of re-drawing forever. The API honors `premiumOnly: true`
  // but ignores `premiumOnly: false`, so premium can't be filtered out directly.
  const {
    isLoading: isPremiumLoading,
    data: premiumTotal,
    error: premiumError,
  } = useFetch<SearchProblemResponse, undefined, number>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: searchProblemQuery,
      variables: {
        categorySlug: filters.categorySlug,
        skip: 0,
        limit: 1,
        filters: { ...filterInput, premiumOnly: true },
      },
    }),
    headers: { 'Content-Type': 'application/json' },
    mapResult(result: SearchProblemResponse) {
      return { data: questionListOrThrow(result).total };
    },
    execute: filters.excludePremium,
    keepPreviousData: false,
  });

  const noFreeProblems =
    filters.excludePremium && total !== undefined && premiumTotal !== undefined && total - premiumTotal <= 0;

  // A uniform random index over all matches, re-drawn on each roll.
  const target = useMemo(() => (total ? Math.floor(Math.random() * total) : 0), [total, roll]);
  const skip = target - (target % PAGE_SIZE);

  // Step 2: fetch the page that holds the target.
  const {
    isLoading: isPageLoading,
    data: page,
    error: pageError,
  } = useFetch<SearchProblemResponse, undefined, Page>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: searchProblemQuery,
      variables: { categorySlug: filters.categorySlug, skip, limit: PAGE_SIZE, filters: filterInput },
    }),
    headers: { 'Content-Type': 'application/json' },
    mapResult(result: SearchProblemResponse) {
      // Tag the page with its skip: right after a re-roll the hook can still
      // return the previous page, which must not be indexed with the new target.
      return { data: { skip, problems: questionListOrThrow(result).data } };
    },
    execute: !!total && (!filters.excludePremium || premiumTotal !== undefined) && !noFreeProblems,
    keepPreviousData: false,
  });

  const problems = page?.skip === skip ? page.problems : undefined;
  const candidate = problems?.[target - skip];
  // Re-draw when the target is premium but premium is excluded (or is missing
  // because the list shrank since it was counted). Rejection sampling keeps the
  // pick uniform among eligible problems, and it ends because at least one free
  // problem exists (noFreeProblems is checked first).
  const shouldRedraw = !!problems && (!candidate || (filters.excludePremium && candidate.isPaidOnly));
  const picked = shouldRedraw ? undefined : candidate;

  // `roll` is a dependency too: a re-draw can land on the same premium index,
  // leaving shouldRedraw and target unchanged, and must still re-draw again.
  useEffect(() => {
    if (shouldRedraw) setRoll((r) => r + 1);
  }, [shouldRedraw, target, roll]);

  // Step 3: the picked problem's description, which the list query leaves out.
  const {
    isLoading: isProblemLoading,
    data: problem,
    error: problemError,
    revalidate: reloadProblem,
  } = useFetch<GetProblemResponse, undefined, Problem>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ query: getProblemQuery, variables: { titleSlug: picked?.titleSlug } }),
    headers: { 'Content-Type': 'application/json' },
    mapResult(result: GetProblemResponse) {
      return { data: result.data.problem };
    },
    execute: !!picked,
    keepPreviousData: false,
  });
  // Right after a re-roll the hook can still hold the previous problem.
  const pickedProblem = picked && problem?.titleSlug === picked.titleSlug ? problem : undefined;

  const error = totalError ?? premiumError ?? pageError;
  const isLoading = isTotalLoading || isPremiumLoading || isPageLoading;

  if (error) {
    return <Detail markdown={`# Couldn't load problems\n\n${error.message}`} />;
  }

  if (!isLoading && total === 0) {
    return <Detail markdown={'# No matches\n\nNo problems match these filters. Try loosening them.'} />;
  }

  if (noFreeProblems) {
    return (
      <Detail
        markdown={
          '# Only premium here\n\nEvery problem matching these filters is premium. Include premium problems or loosen the filters.'
        }
      />
    );
  }

  if (!picked) {
    return <Detail isLoading navigationTitle="Random LeetCode Problem" markdown="# Rolling…" />;
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
  const markdown = `# ${picked.questionFrontendId}. ${picked.title}\n\n${
    pickedProblem
      ? problemContentMarkdown(pickedProblem)
      : problemError && !isProblemLoading
        ? `> Couldn't load the description${problemError.message ? ` (${problemError.message})` : ''}. Choose **Reload Description** from the actions (⌘K) to try again.`
        : ''
  }`;
  const topicTags = showTopicTags ? (pickedProblem?.topicTags ?? []) : [];

  return (
    <Detail
      isLoading={isLoading || isProblemLoading}
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
          {topicTags.length > 0 ? (
            <Detail.Metadata.TagList title="Topics">
              {topicTags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.name} text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Pick Another" icon={Icon.Shuffle} onAction={() => setRoll((r) => r + 1)} />
          {problemError && !pickedProblem ? (
            <Action title="Reload Description" icon={Icon.ArrowClockwise} onAction={reloadProblem} />
          ) : null}
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action
            title="Preview Full Problem"
            icon={Icon.Eye}
            onAction={() => push(<ProblemDetail titleSlug={picked.titleSlug} />)}
          />
          <Action.CopyToClipboard title="Copy Link" content={url} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  // Controlled fields persisted with useCachedState instead of `storeValue`: a
  // stored value is shown again on reopen but submitted as unset until the field
  // is touched, so a checked "Exclude premium" box was sent as false and the
  // empty "All" category as null.
  const [difficulty, setDifficulty] = useCachedState('random-difficulty', '');
  const [categorySlug, setCategorySlug] = useCachedState('random-category', '');
  const [tags, setTags] = useCachedState<string[]>('random-tags', []);
  const [excludePremium, setExcludePremium] = useCachedState('random-exclude-premium', false);

  function onSubmit() {
    // Dropdowns report the empty "Any"/"All" value as null, and LeetCode rejects
    // a missing categorySlug, so default to ''.
    push(
      <RandomResult
        filters={{ categorySlug: categorySlug ?? '', difficulty: difficulty ?? '', tags: tags ?? [], excludePremium }}
      />,
    );
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
      <Form.Dropdown id="difficulty" title="Difficulty" value={difficulty} onChange={setDifficulty}>
        <Form.Dropdown.Item value="" title="Any" />
        <Form.Dropdown.Item value="EASY" title="Easy" />
        <Form.Dropdown.Item value="MEDIUM" title="Medium" />
        <Form.Dropdown.Item value="HARD" title="Hard" />
      </Form.Dropdown>

      <Form.Dropdown id="categorySlug" title="Category" value={categorySlug} onChange={setCategorySlug}>
        <Form.Dropdown.Item value="" title="All" />
        <Form.Dropdown.Item value="algorithms" title="Algorithms" />
        <Form.Dropdown.Item value="database" title="Database" />
        <Form.Dropdown.Item value="shell" title="Shell" />
        <Form.Dropdown.Item value="concurrency" title="Concurrency" />
        <Form.Dropdown.Item value="javascript" title="JavaScript" />
        <Form.Dropdown.Item value="pandas" title="pandas" />
      </Form.Dropdown>

      <Form.TagPicker id="tags" title="Topic Tags" value={tags} onChange={setTags}>
        {TOPIC_TAGS.map((tag) => (
          <Form.TagPicker.Item key={tag.slug} value={tag.slug} title={tag.name} />
        ))}
      </Form.TagPicker>

      <Form.Checkbox
        id="excludePremium"
        title="Premium"
        label="Exclude premium (paid-only) problems"
        value={excludePremium}
        onChange={setExcludePremium}
      />
    </Form>
  );
}
