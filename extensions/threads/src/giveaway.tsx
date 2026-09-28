import { useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { countOf, showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { ThreadsPost, ThreadsReply, getPosts, getProfile, getReplies } from "./lib/threads-api";
import { getAccessToken, showApiError } from "./lib/threads-auth";
import { ApiErrorView, MissingTokenView, StaleDataSection } from "./components/token-views";
import {
  DrawOutcome,
  GiveawayFilters,
  Prize,
  drawWinners,
  filterEntries,
  formatResults,
  parseKeywords,
  parseWholeNumber,
} from "./lib/giveaway";
import { MEDIA_TYPE_LABEL, formatDateTime, formatNumber, postKeywords, postTitle } from "./lib/format";

/** Recent posts to offer; a giveaway is almost always one of the last few. */
const MAX_POSTS = 50;

export default function Command() {
  const accessToken = getAccessToken();

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (token: string) => getPosts(token, { maxPosts: MAX_POSTS }),
    [accessToken ?? ""],
    {
      execute: Boolean(accessToken),
      keepPreviousData: true,
      onError: (err) => void showApiError(err, { title: "Couldn't Load Posts" }),
    },
  );

  // Once per load, not per render: the search bar re-renders on every keystroke.
  const keywordsById = useMemo(
    () => new Map((data?.posts ?? []).map((post) => [post.id, postKeywords(post.text)])),
    [data],
  );

  if (!accessToken) return <MissingTokenView />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Pick the giveaway post…">
      {error && !data ? (
        <ApiErrorView error={error} fallbackTitle="Couldn't Load Posts" onRefresh={revalidate} />
      ) : null}
      {error && data ? (
        <StaleDataSection error={error} fallbackTitle="Couldn't Load Posts" onRefresh={revalidate} />
      ) : null}

      {data ? (
        <List.Section title="Your Posts" subtitle={countOf(data.posts.length, "post")}>
          {data.posts.map((post) => (
            <List.Item
              key={post.id}
              icon={{ source: Icon.Gift, tintColor: Color.Magenta }}
              title={postTitle(post.text)}
              subtitle={MEDIA_TYPE_LABEL[post.mediaType]}
              keywords={keywordsById.get(post.id)}
              accessories={[{ date: new Date(post.timestamp), tooltip: formatDateTime(post.timestamp) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Set up Giveaway"
                    icon={Icon.Gift}
                    target={<GiveawayForm accessToken={accessToken} post={post} />}
                  />
                  {post.permalink ? <Action.OpenInBrowser title="Open on Threads" url={post.permalink} /> : null}
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

interface LoadedReplies {
  replies: ThreadsReply[];
  /** Every reply the API returned, before the host's own, hidden, and private ones are removed. */
  loaded: number;
  truncated: boolean;
  dropped: number;
  hidden: number;
  hostUsername: string;
}

async function loadReplies(accessToken: string, postId: string): Promise<LoadedReplies> {
  const [profile, { replies, truncated, dropped, hidden }] = await Promise.all([
    getProfile(accessToken),
    getReplies(accessToken, postId),
  ]);
  // The host replying to entrants must not win their own giveaway.
  const host = profile.username.toLowerCase();
  const entrants = replies.filter((reply) => reply.username.toLowerCase() !== host);
  logger.log(`[giveaway] Loaded replies`, {
    postId,
    total: replies.length,
    entrants: entrants.length,
    truncated,
    dropped,
    hidden,
  });
  return {
    replies: entrants,
    loaded: replies.length + dropped + hidden,
    truncated,
    dropped,
    hidden,
    hostUsername: profile.username,
  };
}

interface PrizeDraft {
  name: string;
  count: string;
}

/** Everything the form submits; prize rows are added dynamically so they are read off state instead. */
interface GiveawayFormValues {
  onePerAccount: boolean;
  requireText: boolean;
  keywords: string;
  minMentions: string;
  before: Date | null;
  excluded: string[];
}

function GiveawayForm({ accessToken, post }: { accessToken: string; post: ThreadsPost }) {
  const { push } = useNavigation();
  const [prizes, setPrizes] = useState<PrizeDraft[]>([{ name: "", count: "1" }]);

  const { data, isLoading, error, revalidate } = useCachedPromise(loadReplies, [accessToken, post.id], {
    onError: (err) => void showApiError(err, { title: "Couldn't Load Replies", copyContext: `post ${post.id}` }),
  });

  const usernames = useMemo(() => {
    const seen = new Map<string, string>();
    for (const reply of data?.replies ?? []) {
      const key = reply.username.toLowerCase();
      if (!seen.has(key)) seen.set(key, reply.username);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const repliesSummary = isLoading
    ? "Loading replies…"
    : error
      ? "Replies could not be loaded"
      : data
        ? [
            `${countOf(data.replies.length, "reply")} from ${countOf(usernames.length, "account")}`,
            data.dropped > 0 ? `${countOf(data.dropped, "reply")} from private accounts excluded` : "",
            data.hidden > 0 ? `${countOf(data.hidden, "hidden or blocked reply")} excluded` : "",
            data.truncated ? `only the first ${formatNumber(data.loaded)} were loaded` : "",
          ]
            .filter(Boolean)
            .join(" — ")
        : "No replies loaded";

  function updatePrize(index: number, patch: Partial<PrizeDraft>) {
    setPrizes((current) => current.map((prize, i) => (i === index ? { ...prize, ...patch } : prize)));
  }

  async function handleSubmit(values: GiveawayFormValues) {
    // `useCachedPromise` keeps the cached reply list in `data` after a failed reload,
    // so an error blocks the draw even when `data` is present.
    if (error) {
      await showApiError(error, { title: "Couldn't Load Replies", copyContext: `post ${post.id}` });
      return;
    }
    // It also hands back that cached list while it revalidates, so a draw started in
    // that window would be made from an entry pool that is already out of date — the
    // one thing a giveaway must not do.
    if (isLoading || !data) {
      await showError("The reply list is still loading. Draw again once it finishes.", {
        title: "Replies Not Ready",
      });
      return;
    }

    const parsedPrizes: Prize[] = [];
    for (const [index, draft] of prizes.entries()) {
      const name = draft.name.trim();
      const count = parseWholeNumber(draft.count);
      if (!name) {
        await showError(`Give prize ${index + 1} a name.`, { title: "Prize Name Missing" });
        return;
      }
      if (count === undefined || count < 1) {
        await showError(`Prize ${index + 1} needs a quantity of at least 1.`, { title: "Invalid Prize Quantity" });
        return;
      }
      parsedPrizes.push({ name, count });
    }

    const minMentions = values.minMentions.trim() ? parseWholeNumber(values.minMentions) : 0;
    if (minMentions === undefined) {
      await showError("Minimum mentions must be a whole number.", { title: "Invalid Mention Count" });
      return;
    }

    const filters: GiveawayFilters = {
      onePerAccount: values.onePerAccount,
      requireText: values.requireText,
      keywords: parseKeywords(values.keywords),
      minMentions,
      before: values.before ?? undefined,
      excludedUsernames: values.excluded,
      hostUsername: data.hostUsername,
    };

    const eligible = filterEntries(data.replies, filters);
    if (eligible.length === 0) {
      await showError("No replies match the entry conditions.", { title: "No Eligible Entries" });
      return;
    }

    const outcome = drawWinners(eligible, parsedPrizes);
    logger.log(`[giveaway] Drew winners`, {
      postId: post.id,
      pool: outcome.pool,
      won: outcome.won,
      shortfall: outcome.shortfall,
    });

    push(
      <GiveawayResults
        post={post}
        eligible={eligible}
        prizes={parsedPrizes}
        initial={outcome}
        totalReplies={data.replies.length}
      />,
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Giveaway"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Draw Winners" icon={Icon.Trophy} onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action
              title="Add Prize"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => setPrizes((current) => [...current, { name: "", count: "1" }])}
            />
            {prizes.length > 1 ? (
              <Action
                title="Remove Last Prize"
                icon={Icon.Minus}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => setPrizes((current) => current.slice(0, -1))}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Reload Replies"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            {post.permalink ? <Action.OpenInBrowser title="Open Post on Threads" url={post.permalink} /> : null}
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description title="Post" text={postTitle(post.text)} />
      <Form.Description title="Replies" text={repliesSummary} />
      <Form.Separator />

      <Form.Checkbox
        id="onePerAccount"
        label="One entry per account"
        defaultValue={true}
        info="Keeps each account's earliest reply."
      />
      <Form.Checkbox id="requireText" label="Must have comment text" defaultValue={false} />
      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="keyword, another keyword"
        info="The reply must contain at least one of these. Separate several with commas."
      />
      <Form.TextField
        id="minMentions"
        title="Minimum Mentions"
        placeholder="0"
        info="How many different accounts the reply has to tag. Tagging you doesn't count, and the same account twice counts once."
      />
      <Form.DatePicker
        id="before"
        title="Replied Before"
        type={Form.DatePicker.Type.DateTime}
        info="Only replies posted up to this moment count."
      />
      <Form.TagPicker id="excluded" title="Exclude Accounts" placeholder="Pick accounts that can't win">
        {usernames.map((username) => (
          <Form.TagPicker.Item key={username} value={username} title={`@${username}`} />
        ))}
      </Form.TagPicker>
      <Form.Description text="The Threads API can only verify replies. Repost, follow, and like conditions have to be checked manually on the winners." />
      <Form.Separator />

      {prizes.map((prize, index) => (
        <PrizeFields key={index} index={index} prize={prize} onChange={(patch) => updatePrize(index, patch)} />
      ))}
      <Form.Description text="Add or remove prizes from the action menu." />
    </Form>
  );
}

function PrizeFields({
  index,
  prize,
  onChange,
}: {
  index: number;
  prize: PrizeDraft;
  onChange: (patch: Partial<PrizeDraft>) => void;
}) {
  return (
    <>
      <Form.TextField
        id={`prize-${index}-name`}
        title={`Prize ${index + 1}`}
        placeholder="Prize name"
        value={prize.name}
        onChange={(name) => onChange({ name })}
      />
      <Form.TextField
        id={`prize-${index}-count`}
        title="Quantity"
        placeholder="1"
        value={prize.count}
        onChange={(count) => onChange({ count })}
      />
    </>
  );
}

function GiveawayResults({
  post,
  eligible,
  prizes,
  initial,
  totalReplies,
}: {
  post: ThreadsPost;
  eligible: ThreadsReply[];
  prizes: Prize[];
  initial: DrawOutcome;
  totalReplies: number;
}) {
  const [draw, setDraw] = useState(() => ({ outcome: initial, drawnAt: new Date() }));
  const { outcome, drawnAt } = draw;
  const resultsText = formatResults(outcome.results);

  async function redraw() {
    const next = drawWinners(eligible, prizes);
    setDraw({ outcome: next, drawnAt: new Date() });
    await showToast({
      style: Toast.Style.Success,
      title: "Redrawn",
      message: `${countOf(next.won, "winner")} from ${countOf(next.pool, "entry")}`,
    });
  }

  const summary = `Drew ${countOf(outcome.won, "winner")} from ${countOf(outcome.pool, "eligible entry")}`;

  const sharedActions = (
    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy Results" content={resultsText} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action title="Redraw" icon={Icon.Shuffle} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={redraw} />
      {post.permalink ? <Action.OpenInBrowser title="Open Post on Threads" url={post.permalink} /> : null}
    </ActionPanel.Section>
  );

  return (
    <List navigationTitle="Giveaway Results" isShowingDetail searchBarPlaceholder="Search winners…">
      <List.Section title="Summary">
        <List.Item
          icon={{ source: Icon.Trophy, tintColor: outcome.shortfall ? Color.Orange : Color.Green }}
          title={summary}
          accessories={[{ text: formatDateTime(drawnAt), tooltip: "Drawn at" }]}
          detail={
            <List.Item.Detail
              markdown={
                outcome.shortfall
                  ? `⚠️ Not enough eligible accounts for every prize — all ${outcome.won} were drawn.\n\n\`\`\`\n${resultsText}\n\`\`\``
                  : `\`\`\`\n${resultsText}\n\`\`\``
              }
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Post" text={postTitle(post.text)} />
                  <List.Item.Detail.Metadata.Label title="Eligible Entries" text={formatNumber(outcome.pool)} />
                  <List.Item.Detail.Metadata.Label title="Replies Loaded" text={formatNumber(totalReplies)} />
                  <List.Item.Detail.Metadata.Label title="Winners" text={formatNumber(outcome.won)} />
                  <List.Item.Detail.Metadata.Label title="Drawn At" text={formatDateTime(drawnAt)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={<ActionPanel>{sharedActions}</ActionPanel>}
        />
      </List.Section>

      {outcome.results.map((result, index) => (
        <List.Section
          key={`${index}-${result.prize.name}`}
          title={result.prize.name}
          subtitle={`${result.winners.length} of ${result.prize.count}`}
        >
          {result.winners.map((winner, position) => (
            <List.Item
              key={winner.id}
              icon={{ source: Icon.Person, tintColor: Color.Magenta }}
              title={`@${winner.username}`}
              subtitle={`#${position + 1}`}
              keywords={[winner.username]}
              accessories={[{ date: new Date(winner.timestamp), tooltip: formatDateTime(winner.timestamp) }]}
              detail={
                <List.Item.Detail
                  markdown={winner.text.trim() ? winner.text : "_No text_"}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Prize" text={result.prize.name} />
                      <List.Item.Detail.Metadata.Label title="Account" text={`@${winner.username}`} />
                      <List.Item.Detail.Metadata.Label title="Replied" text={formatDateTime(winner.timestamp)} />
                      {winner.permalink ? (
                        <List.Item.Detail.Metadata.Link
                          title="Reply"
                          text="Open on Threads"
                          target={winner.permalink}
                        />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Username" content={`@${winner.username}`} />
                  {winner.permalink ? (
                    <Action.OpenInBrowser title="Open Reply on Threads" url={winner.permalink} />
                  ) : null}
                  {sharedActions}
                </ActionPanel>
              }
            />
          ))}
          {result.winners.length === 0 ? (
            <List.Item
              icon={Icon.XMarkCircle}
              title="No winner drawn"
              subtitle="Not enough eligible entries"
              actions={<ActionPanel>{sharedActions}</ActionPanel>}
            />
          ) : null}
        </List.Section>
      ))}
    </List>
  );
}
