import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { searchFiltersSchema, type SearchFilters } from "../tinyfish";

type Values = {
  type: string;
  time: string;
  after: Date | null;
  before: Date | null;
  yearFrom: string;
  yearTo: string;
  includeDomains: string;
  excludeDomains: string;
  purpose: string;
};

function calendarDate(date: Date | null) {
  if (!date) return undefined;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function SearchFiltersForm({
  filters,
  onApply,
}: {
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}) {
  const { pop } = useNavigation();
  const time = filters.type === "research_paper" ? undefined : filters.time;
  const { handleSubmit, itemProps, values, setValidationError } = useForm<Values>({
    initialValues: {
      type: filters.type,
      time: time?.kind === "recent" ? String(time.minutes) : time?.kind === "dates" ? "dates" : "any",
      after: time?.kind === "dates" && time.after ? new Date(`${time.after}T00:00:00`) : null,
      before: time?.kind === "dates" && time.before ? new Date(`${time.before}T00:00:00`) : null,
      yearFrom: filters.type === "research_paper" && filters.yearFrom !== undefined ? String(filters.yearFrom) : "",
      yearTo: filters.type === "research_paper" && filters.yearTo !== undefined ? String(filters.yearTo) : "",
      includeDomains: filters.includeDomains ?? "",
      excludeDomains: filters.excludeDomains ?? "",
      purpose: filters.purpose ?? "",
    },
    onSubmit(values) {
      const common = {
        type: values.type,
        purpose: values.purpose.trim() || undefined,
        includeDomains:
          values.includeDomains
            .split(/[\s,]+/)
            .filter(Boolean)
            .join(",") || undefined,
        excludeDomains:
          values.excludeDomains
            .split(/[\s,]+/)
            .filter(Boolean)
            .join(",") || undefined,
      };
      const parsed = searchFiltersSchema.safeParse(
        values.type === "research_paper"
          ? {
              ...common,
              yearFrom: values.yearFrom.trim() ? Number(values.yearFrom) : undefined,
              yearTo: values.yearTo.trim() ? Number(values.yearTo) : undefined,
            }
          : {
              ...common,
              time:
                values.time === "any"
                  ? { kind: "any" }
                  : values.time === "dates"
                    ? {
                        kind: "dates",
                        after: calendarDate(values.after),
                        before: calendarDate(values.before),
                      }
                    : { kind: "recent", minutes: Number(values.time) },
            },
      );
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field =
          issue.path[0] === "purpose"
            ? "purpose"
            : values.type === "research_paper"
              ? issue.path[0] === "yearFrom"
                ? "yearFrom"
                : "yearTo"
              : "before";
        setValidationError(field, issue.message);
        return;
      }
      onApply(parsed.data);
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Search Filters"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Filters" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Search" {...itemProps.type}>
        <Form.Dropdown.Item value="web" title="Web" />
        <Form.Dropdown.Item value="news" title="News" />
        <Form.Dropdown.Item value="research_paper" title="Research Papers" />
      </Form.Dropdown>
      {values.type === "research_paper" ? (
        <>
          <Form.TextField title="From Year" placeholder="e.g. 2020" {...itemProps.yearFrom} />
          <Form.TextField title="Through Year" placeholder="e.g. 2026" {...itemProps.yearTo} />
        </>
      ) : (
        <>
          <Form.Dropdown title="Published" {...itemProps.time}>
            <Form.Dropdown.Item value="any" title="Any Time" />
            <Form.Dropdown.Item value="60" title="Past Hour" />
            <Form.Dropdown.Item value="1440" title="Past Day" />
            <Form.Dropdown.Item value="10080" title="Past Week" />
            <Form.Dropdown.Item value="43200" title="Past 30 Days" />
            <Form.Dropdown.Item value="525600" title="Past Year" />
            <Form.Dropdown.Item value="dates" title="Custom Date Range" />
          </Form.Dropdown>
          {values.time === "dates" ? (
            <>
              <Form.DatePicker title="After" type={Form.DatePicker.Type.Date} {...itemProps.after} />
              <Form.DatePicker title="Before" type={Form.DatePicker.Type.Date} {...itemProps.before} />
            </>
          ) : null}
        </>
      )}
      <Form.Separator />
      <Form.TextArea
        title="Purpose"
        placeholder="What are you trying to find?"
        info="Optional context for TinyFish, up to 2,000 characters."
        {...itemProps.purpose}
      />
      <Form.TextField
        title="Include Domains"
        placeholder="github.com, arxiv.org"
        info="Limit results to these domains. Separate domains with commas."
        {...itemProps.includeDomains}
      />
      <Form.TextField
        title="Exclude Domains"
        placeholder="pinterest.com, quora.com"
        info="Remove results from these domains. Separate domains with commas."
        {...itemProps.excludeDomains}
      />
    </Form>
  );
}
