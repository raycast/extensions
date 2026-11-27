import { Form, showToast, Toast, type LaunchProps } from "@raycast/api";
import { useForm } from "@raycast/utils";
import {
  AccountsSection,
  DatesSection,
  EngagementSection,
  FiltersSection,
  WordsSection,
} from "./components/form-sections";
import { SearchActions } from "./components/search-actions";
import { NOTHING_TO_SEARCH, SEARCH_LINK_DID_NOT_OPEN } from "./features/failure-messages";
import {
  isFromDateAfterToDate,
  restoreForm,
  validateWholeNumber,
  type AdvancedSearchDraft,
  type AdvancedSearchValues,
} from "./features/search-form";
import { buildSearchLink, type ResultsTab } from "./features/search-link";
import { writeSearchQuery } from "./features/search-query";
import { openSearchLink } from "./lib/open-search-link";
import { readPreferredTab } from "./lib/preferences";

async function submitSearch(values: AdvancedSearchValues, resultsTab: ResultsTab): Promise<boolean> {
  if (isFromDateAfterToDate(values.fromDate, values.toDate)) {
    await showToast({ style: Toast.Style.Failure, title: "From is after To" });
    return false;
  }
  const searchLink = buildSearchLink(writeSearchQuery(values), resultsTab);
  if (searchLink === null) {
    await showToast({ style: Toast.Style.Failure, title: NOTHING_TO_SEARCH });
    return false;
  }
  const opened = await openSearchLink(searchLink);
  if (!opened) {
    await showToast({ style: Toast.Style.Failure, title: SEARCH_LINK_DID_NOT_OPEN });
    return false;
  }
  return true;
}

export default function AdvancedSearchCommand(props: LaunchProps<{ draftValues: AdvancedSearchDraft }>) {
  const preferredTab = readPreferredTab();
  // useForm's onSubmit cannot learn which results tab was chosen, so it only reports valid fields.
  const {
    handleSubmit: validateForm,
    itemProps,
    values,
  } = useForm<AdvancedSearchValues>({
    initialValues: restoreForm(props.draftValues),
    validation: { minReplies: validateWholeNumber, minLikes: validateWholeNumber, minReposts: validateWholeNumber },
    onSubmit: () => true,
  });
  async function searchIfValid(submitted: AdvancedSearchValues, resultsTab: ResultsTab): Promise<boolean> {
    const isValid = await validateForm(submitted);
    if (isValid !== true) return false;
    return submitSearch(submitted, resultsTab);
  }
  const query = writeSearchQuery(values);
  const searchLink = buildSearchLink(query, preferredTab);

  return (
    <Form
      enableDrafts
      actions={
        <SearchActions query={query} searchLink={searchLink} preferredTab={preferredTab} onSearch={searchIfValid} />
      }
    >
      <WordsSection itemProps={itemProps} />
      <AccountsSection itemProps={itemProps} />
      <FiltersSection itemProps={itemProps} />
      <EngagementSection itemProps={itemProps} />
      <DatesSection itemProps={itemProps} />
    </Form>
  );
}
