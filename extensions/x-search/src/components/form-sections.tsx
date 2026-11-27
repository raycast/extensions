import { Form } from "@raycast/api";
import { type useForm } from "@raycast/utils";
import { pickableDateRange } from "../features/calendar-day";
import { LANGUAGE_OPTIONS } from "../features/languages";
import { FILTER_MODES, parseFilterMode, type AdvancedSearchValues, type FilterMode } from "../features/search-form";

export type AdvancedSearchItemProps = ReturnType<typeof useForm<AdvancedSearchValues>>["itemProps"];

type SectionProps = { itemProps: AdvancedSearchItemProps };

const ACCOUNTS_HINT = "Separate accounts with spaces or commas. The @ is optional.";
const HASHTAGS_HINT = "Separate hashtags with spaces or commas. The # is optional.";

function exampleProps(sample: string, meaning: string, hint?: string): { placeholder: string; info: string } {
  const example = `Example: ${sample} · ${meaning}`;
  return { placeholder: sample, info: hint === undefined ? example : `${example}. ${hint}` };
}

const REPLIES_FILTER_TITLES: Record<FilterMode, string> = {
  include: "Include replies and original posts",
  only: "Only show replies",
  exclude: "Don’t include replies",
};

const LINKS_FILTER_TITLES: Record<FilterMode, string> = {
  include: "Include posts with links",
  only: "Only show posts with links",
  exclude: "Don’t include posts with links",
};

function filterModeItems(titles: Record<FilterMode, string>) {
  return FILTER_MODES.map((mode) => <Form.Dropdown.Item key={mode} value={mode} title={titles[mode]} />);
}

function withFilterMode(event: Form.Event<string>): Form.Event<FilterMode> {
  const value = event.target.value;
  return {
    type: event.type,
    target: { id: event.target.id, value: value === undefined ? undefined : parseFilterMode(value) },
  };
}

function filterModeDropdownProps(props: Partial<Form.ItemProps<FilterMode>> & { id: string }) {
  const { onChange, onBlur, onFocus, ...rest } = props;
  return {
    ...rest,
    onChange: (newValue: string) => onChange?.(parseFilterMode(newValue)),
    onBlur: (event: Form.Event<string>) => onBlur?.(withFilterMode(event)),
    onFocus: (event: Form.Event<string>) => onFocus?.(withFilterMode(event)),
  };
}

export function WordsSection({ itemProps }: SectionProps) {
  return (
    <>
      <Form.Description title="Words" text="Words a post must contain, or must not." />
      <Form.TextField
        title="All of these words"
        {...exampleProps("what’s happening", "contains both “what’s” and “happening”")}
        {...itemProps.allWords}
      />
      <Form.TextField
        title="This exact phrase"
        {...exampleProps("happy hour", "contains the exact phrase “happy hour”")}
        {...itemProps.exactPhrase}
      />
      <Form.TextField
        title="Any of these words"
        {...exampleProps("cats dogs", "contains either “cats” or “dogs” (or both)")}
        {...itemProps.anyWords}
      />
      <Form.TextField
        title="None of these words"
        {...exampleProps("cats dogs", "does not contain “cats” and does not contain “dogs”")}
        {...itemProps.noneWords}
      />
      <Form.TextField
        title="These hashtags"
        {...exampleProps("#ThrowbackThursday", "contains the hashtag #ThrowbackThursday", HASHTAGS_HINT)}
        {...itemProps.hashtags}
      />
      <Form.Dropdown title="Language" info="Any language leaves this out" {...itemProps.language}>
        {LANGUAGE_OPTIONS.map((language) => (
          <Form.Dropdown.Item key={language.value} value={language.value} title={language.title} />
        ))}
      </Form.Dropdown>
    </>
  );
}

export function AccountsSection({ itemProps }: SectionProps) {
  return (
    <>
      <Form.Separator />
      <Form.Description title="Accounts" text="Accounts that sent, received, or are mentioned." />
      <Form.TextField
        title="From these accounts"
        {...exampleProps("@X", "sent from @X", ACCOUNTS_HINT)}
        {...itemProps.fromAccounts}
      />
      <Form.TextField
        title="To these accounts"
        {...exampleProps("@X", "sent in reply to @X", ACCOUNTS_HINT)}
        {...itemProps.toAccounts}
      />
      <Form.TextField
        title="Mentioning these accounts"
        {...exampleProps("@SFBART @Caltrain", "mentions @SFBART or mentions @Caltrain", ACCOUNTS_HINT)}
        {...itemProps.mentionedAccounts}
      />
    </>
  );
}

export function FiltersSection({ itemProps }: SectionProps) {
  return (
    <>
      <Form.Separator />
      <Form.Description title="Filters" text="Whether replies and links stay in the results." />
      <Form.Dropdown title="Replies" {...filterModeDropdownProps(itemProps.replies)}>
        {filterModeItems(REPLIES_FILTER_TITLES)}
      </Form.Dropdown>
      <Form.Dropdown title="Links" {...filterModeDropdownProps(itemProps.links)}>
        {filterModeItems(LINKS_FILTER_TITLES)}
      </Form.Dropdown>
    </>
  );
}

export function EngagementSection({ itemProps }: SectionProps) {
  return (
    <>
      <Form.Separator />
      <Form.Description title="Engagement" text="The least interaction a post must have." />
      <Form.TextField
        title="Minimum replies"
        {...exampleProps("280", "posts with at least 280 replies")}
        {...itemProps.minReplies}
      />
      <Form.TextField
        title="Minimum Likes"
        {...exampleProps("280", "posts with at least 280 Likes")}
        {...itemProps.minLikes}
      />
      <Form.TextField
        title="Minimum reposts"
        {...exampleProps("280", "posts with at least 280 reposts")}
        {...itemProps.minReposts}
      />
    </>
  );
}

export function DatesSection({ itemProps }: SectionProps) {
  const dates = pickableDateRange();
  return (
    <>
      <Form.Separator />
      <Form.Description title="Dates" text="When the post was published." />
      <Form.DatePicker
        title="From"
        info="Posts on or after this date"
        type={Form.DatePicker.Type.Date}
        min={dates.min}
        max={dates.max}
        {...itemProps.fromDate}
      />
      <Form.DatePicker
        title="To"
        info="Posts on or before this date"
        type={Form.DatePicker.Type.Date}
        min={dates.min}
        max={dates.max}
        {...itemProps.toDate}
      />
    </>
  );
}
