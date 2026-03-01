import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  validateSearchQuery,
  type MatchMode,
  type SearchQuery,
} from "@filipkillander/radiokollen-sdk";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  createDefaultQuery,
  parseIsoDateToLocalDate,
  toPresetDates,
  type SearchPreset,
} from "./shared";
import { SearchResultsView } from "./search-results-view";

type SearchFormValues = {
  fromDate: Date;
  toDate: Date;
  artist: string;
  label: string;
  title: string;
  matchMode: MatchMode;
};

type SearchRadiokollenCommandProps = {
  initialQuery?: SearchQuery;
};

export function SearchRadiokollenCommand({
  initialQuery,
}: SearchRadiokollenCommandProps) {
  const { push } = useNavigation();
  const defaultQuery = initialQuery ?? createDefaultQuery();

  const [values, setValues] = useStateFromQuery(defaultQuery);

  function applyPreset(preset: SearchPreset) {
    const dates = toPresetDates(preset);

    setValues((previous) => ({
      ...previous,
      fromDate: dates.fromDate,
      toDate: dates.toDate,
    }));
  }

  async function handleSubmit(formValues: SearchFormValues) {
    const query: SearchQuery = {
      artist: formValues.artist,
      label: formValues.label,
      title: formValues.title,
      fromDate: toInputDateValue(formValues.fromDate),
      toDate: toInputDateValue(formValues.toDate),
      matchMode: formValues.matchMode,
    };

    const validation = validateSearchQuery(query);

    if (!validation.success || !validation.query) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Ogiltig sökning",
        message: validation.error ?? "Kontrollera dina sökvärden.",
      });
      return;
    }

    push(<SearchResultsView query={validation.query} />);
  }

  return (
    <Form
      navigationTitle="Sök Radiokollen"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sök I P4" onSubmit={handleSubmit} />
          <Action title="Senaste 24H" onAction={() => applyPreset("24h")} />
          <Action title="7 Dagar" onAction={() => applyPreset("7d")} />
          <Action title="31 Dagar" onAction={() => applyPreset("31d")} />
        </ActionPanel>
      }
    >
      <Form.Description text="Sök över alla P4-regioner med artist, label och låttitel." />

      <Form.DatePicker
        id="fromDate"
        title="Från"
        value={values.fromDate}
        onChange={(nextValue) =>
          setValues((previous) => ({ ...previous, fromDate: nextValue }))
        }
      />

      <Form.DatePicker
        id="toDate"
        title="Till"
        value={values.toDate}
        onChange={(nextValue) =>
          setValues((previous) => ({ ...previous, toDate: nextValue }))
        }
      />

      <Form.TextField
        id="artist"
        title="Artist"
        placeholder="ex. Veronica Maggio"
        value={values.artist}
        onChange={(nextValue) =>
          setValues((previous) => ({ ...previous, artist: nextValue }))
        }
      />

      <Form.TextField
        id="label"
        title="Label"
        placeholder="ex. Universal"
        value={values.label}
        onChange={(nextValue) =>
          setValues((previous) => ({ ...previous, label: nextValue }))
        }
      />

      <Form.TextField
        id="title"
        title="Låttitel"
        placeholder="ex. Jag kommer"
        value={values.title}
        onChange={(nextValue) =>
          setValues((previous) => ({ ...previous, title: nextValue }))
        }
      />

      <Form.Dropdown
        id="matchMode"
        title="Matchning"
        value={values.matchMode}
        onChange={(nextValue) =>
          setValues((previous) => ({
            ...previous,
            matchMode: nextValue === "exact" ? "exact" : "broad",
          }))
        }
      >
        <Form.Dropdown.Item value="broad" title="Bred" />
        <Form.Dropdown.Item value="exact" title="Exakt" />
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  return <SearchRadiokollenCommand />;
}

function useStateFromQuery(
  query: SearchQuery,
): [SearchFormValues, Dispatch<SetStateAction<SearchFormValues>>] {
  return useState<SearchFormValues>({
    fromDate: parseIsoDateToLocalDate(query.fromDate),
    toDate: parseIsoDateToLocalDate(query.toDate),
    artist: query.artist ?? "",
    label: query.label ?? "",
    title: query.title ?? "",
    matchMode: query.matchMode,
  });
}

function toInputDateValue(value: Date): string {
  return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, "0")}-${`${value.getDate()}`.padStart(2, "0")}`;
}
