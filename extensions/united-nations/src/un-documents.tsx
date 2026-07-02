import { useMemo, useState } from "react";
import { Action, ActionPanel, Detail, Form, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { DocumentsUnSearchResult, fetchDocumentsUnSearch, fetchDocumentsUnSubjects } from "./api.js";

type DocumentsUnSubject = {
  code: string;
  title: string;
};

type DocumentsUnTruncation = "right" | "left" | "both" | "none";
type DocumentsUnFullTextLanguage = "" | "ar" | "zh" | "en" | "fr" | "ru" | "es" | "other";
type DocumentsUnFullTextType = "Find this phrase" | "Find all words" | "Find any words" | "Use boolean operators";
type DocumentsUnSortField =
  | "Sort by relevance"
  | "Sort by date - descending"
  | "Sort by date - ascending"
  | "Sort by symbol";

type DocumentsUnSearchFormValues = {
  symbol: string;
  truncation: DocumentsUnTruncation;
  title: string;
  jobNumber: string;
  session: string;
  agenda: string;
  subjectCodes: string[];
  publicationDateFrom: Date | null;
  publicationDateTo: Date | null;
  releaseDateFrom: Date | null;
  releaseDateTo: Date | null;
  fullTextSearchText: string;
  fullTextSearchExact: boolean;
  fullTextSearchLanguage: DocumentsUnFullTextLanguage;
  fullTextSearchType: DocumentsUnFullTextType;
  sortField: DocumentsUnSortField;
};

type DocumentsUnSearchPayload = {
  symbol: string;
  jobNumber: string;
  publicationDate: string;
  releaseDate: string;
  title: string;
  subject: string;
  session: string;
  agenda: string;
  truncation: DocumentsUnTruncation;
  fullTextSearch: {
    language: DocumentsUnFullTextLanguage;
    searchText: string;
    type: DocumentsUnFullTextType;
    exact: boolean;
  };
  sortOptions: {
    sortField: DocumentsUnSortField;
  };
  pagination: {
    currentPage: number;
    itemsPerPage: number;
  };
  screenLanguage: "en";
  tcodes: string[];
};

type DocumentsUnDocumentLink = {
  title: string;
  url: string;
  format: "PDF" | "DOC";
  languageCode: string;
};

const documentsUnDocumentLanguages = [
  { code: "ar", title: "Arabic" },
  { code: "zh", title: "Chinese" },
  { code: "en", title: "English" },
  { code: "fr", title: "French" },
  { code: "ru", title: "Russian" },
  { code: "es", title: "Spanish" },
  { code: "de", title: "German" },
] as const;

const documentsUnFullTextLanguages = [
  { code: "", title: "All" },
  { code: "ar", title: "Arabic" },
  { code: "zh", title: "Chinese" },
  { code: "en", title: "English" },
  { code: "fr", title: "French" },
  { code: "ru", title: "Russian" },
  { code: "es", title: "Spanish" },
  { code: "other", title: "Other" },
] as const;

const DOCUMENTS_UN_ORIGIN = "https://documents.un.org";

const defaultFormValues: DocumentsUnSearchFormValues = {
  symbol: "",
  truncation: "right",
  title: "",
  jobNumber: "",
  session: "",
  agenda: "",
  subjectCodes: [],
  publicationDateFrom: null,
  publicationDateTo: null,
  releaseDateFrom: null,
  releaseDateTo: null,
  fullTextSearchText: "",
  fullTextSearchExact: false,
  fullTextSearchLanguage: "en",
  fullTextSearchType: "Find this phrase",
  sortField: "Sort by relevance",
};

const padDatePart = (value: number) => String(value).padStart(2, "0");

const formatSearchDate = (date: Date | null) => {
  if (!date) {
    return "*";
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T00:00:00Z`;
};

const formatSearchDateRange = (from: Date | null, to: Date | null) => {
  return `${formatSearchDate(from)} TO ${formatSearchDate(to)}`;
};

const isPlaceholderDate = (value: string | undefined) => {
  if (!value) {
    return true;
  }

  return value.startsWith("0001-01-01") || value.startsWith("1900-01-01");
};

const formatDisplayDate = (value: string | undefined) => {
  if (!value || isPlaceholderDate(value)) {
    return "Unknown";
  }

  return new Date(value).toLocaleDateString();
};

const getFirstNonEmptyValue = (values: string[] | undefined) => {
  return values?.find((value) => value.trim().length > 0);
};

const getSearchPayloadMarkdown = (payload: DocumentsUnSearchPayload, selectedSubjectTitles: string[]) => {
  const selectedSubjects = selectedSubjectTitles.length > 0 ? selectedSubjectTitles.join(", ") : "None";
  const payloadJson = JSON.stringify(payload, null, 2);

  return [
    "# UN Documents Search Payload",
    "",
    "This is the request body that will be sent to `documents.un.org/api/search`.",
    "",
    `Selected subjects: ${selectedSubjects}`,
    "",
    "```json",
    payloadJson,
    "```",
  ].join("\n");
};

const getResultDocumentLinks = (result: DocumentsUnSearchResult): DocumentsUnDocumentLink[] => {
  return documentsUnDocumentLanguages.flatMap((language, index) => {
    const jobNumber = result.job_numbers[index]?.trim();
    const pdfBaseIndex = index * 3;
    const pdfAvailable = [result.sizes[pdfBaseIndex], result.sizes[pdfBaseIndex + 1]].some((size) => size > -1);
    const docAvailable = (result.sizes[pdfBaseIndex + 2] ?? -1) > -1;

    if (!jobNumber) {
      return [];
    }

    const documentLinks: DocumentsUnDocumentLink[] = [];

    if (pdfAvailable) {
      documentLinks.push({
        title: `Open ${language.title} PDF`,
        url: `${DOCUMENTS_UN_ORIGIN}/api/symbol/access?j=${encodeURIComponent(jobNumber)}&t=pdf&i=${encodeURIComponent(result.id)}`,
        format: "PDF",
        languageCode: language.code,
      });
    }

    if (docAvailable) {
      documentLinks.push({
        title: `Open ${language.title} DOC`,
        url: `${DOCUMENTS_UN_ORIGIN}/api/symbol/access?j=${encodeURIComponent(jobNumber)}&t=doc&i=${encodeURIComponent(result.id)}`,
        format: "DOC",
        languageCode: language.code,
      });
    }

    return documentLinks;
  });
};

const getPreferredPdfLink = (result: DocumentsUnSearchResult, preferredLanguage: DocumentsUnFullTextLanguage) => {
  const pdfLinks = getResultDocumentLinks(result).filter((link) => link.format === "PDF");
  const preferredLanguageCodes = [
    preferredLanguage,
    "en",
    ...documentsUnDocumentLanguages.map((language) => language.code),
  ].filter(
    (languageCode, index, array): languageCode is string =>
      languageCode !== "other" && array.indexOf(languageCode) === index,
  );

  for (const languageCode of preferredLanguageCodes) {
    const preferredLink = pdfLinks.find((link) => link.languageCode === languageCode);

    if (preferredLink) {
      return preferredLink;
    }
  }

  return pdfLinks[0];
};

const getResultMarkdown = (result: DocumentsUnSearchResult) => {
  const allSymbols = result.symbols.filter((symbol) => symbol.trim().length > 0).join(" | ") || result.symbol;
  const firstAgenda = getFirstNonEmptyValue(result.agendas);
  const firstSession = getFirstNonEmptyValue(result.sessions);
  const subjects = result.subjects?.filter((subject) => subject.trim().length > 0) ?? [];

  return [
    `# ${result.title}`,
    "",
    `Symbol: ${allSymbols}`,
    `Publication Date: ${formatDisplayDate(result.publication_date)}`,
    `Area: ${result.area}`,
    `Distribution: ${result.distribution}`,
    `Session: ${firstSession ?? "Unknown"}`,
    `Agenda: ${firstAgenda ?? "Unknown"}`,
    "",
    subjects.length > 0 ? `Subjects: ${subjects.join(", ")}` : "Subjects: None",
  ].join("\n");
};

const getSymbolExplorerUrl = (result: DocumentsUnSearchResult) => {
  return `${DOCUMENTS_UN_ORIGIN}/symbol-explorer?s=${encodeURIComponent(result.symbol)}&i=${encodeURIComponent(result.id)}`;
};

const buildSearchPayload = (
  values: DocumentsUnSearchFormValues,
  subjects: DocumentsUnSubject[],
): DocumentsUnSearchPayload => {
  const subjectMap = new Map(subjects.map((subject) => [subject.code, subject.title]));
  const selectedSubjectTitles = values.subjectCodes
    .map((subjectCode) => subjectMap.get(subjectCode))
    .filter((subjectTitle): subjectTitle is string => Boolean(subjectTitle));

  return {
    symbol: values.symbol.trim(),
    jobNumber: values.jobNumber.trim(),
    publicationDate: formatSearchDateRange(values.publicationDateFrom, values.publicationDateTo),
    releaseDate: formatSearchDateRange(values.releaseDateFrom, values.releaseDateTo),
    title: values.title.trim(),
    subject: selectedSubjectTitles.join(", "),
    session: values.session.trim(),
    agenda: values.agenda.trim(),
    truncation: values.truncation,
    fullTextSearch: {
      language: values.fullTextSearchLanguage,
      searchText: values.fullTextSearchText.trim(),
      type: values.fullTextSearchType,
      exact: values.fullTextSearchExact,
    },
    sortOptions: {
      sortField: values.sortField,
    },
    pagination: {
      currentPage: 1,
      itemsPerPage: 20,
    },
    screenLanguage: "en",
    tcodes: values.subjectCodes,
  };
};

function SearchPayloadDetail(props: { payload: DocumentsUnSearchPayload; subjects: DocumentsUnSubject[] }) {
  const selectedSubjectTitles = useMemo(() => {
    const subjectMap = new Map(props.subjects.map((subject) => [subject.code, subject.title]));

    return props.payload.tcodes
      .map((subjectCode) => subjectMap.get(subjectCode))
      .filter((subjectTitle): subjectTitle is string => Boolean(subjectTitle));
  }, [props.payload.tcodes, props.subjects]);

  return <Detail markdown={getSearchPayloadMarkdown(props.payload, selectedSubjectTitles)} />;
}

function SearchResultsList(props: {
  payload: DocumentsUnSearchPayload;
  subjects: DocumentsUnSubject[];
  onEditSearch: () => void;
}) {
  const { data, error, isLoading, revalidate } = usePromise(fetchDocumentsUnSearch, [props.payload]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={isLoading ? "Searching documents.un.org..." : `${data?.totalMatches ?? 0} matches`}
    >
      {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          description="Try adjusting your search criteria."
          actions={
            <ActionPanel>
              <Action title="Edit Search Form" icon={Icon.Pencil} onAction={props.onEditSearch} />
              <Action.Push
                title="View Search Payload"
                icon={Icon.Document}
                target={<SearchPayloadDetail payload={props.payload} subjects={props.subjects} />}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search Failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry Search" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Edit Search Form" icon={Icon.Pencil} onAction={props.onEditSearch} />
            </ActionPanel>
          }
        />
      ) : null}

      {data?.items.map((result) => {
        const preferredPdfLink = getPreferredPdfLink(result, props.payload.fullTextSearch.language);
        const documentLinks = getResultDocumentLinks(result);
        const additionalDocumentLinks = documentLinks.filter((link) => link.url !== preferredPdfLink?.url).slice(0, 8);

        return (
          <List.Item
            key={result.id}
            title={result.symbol}
            subtitle={result.title}
            accessories={[{ text: result.distribution }, { text: formatDisplayDate(result.publication_date) }]}
            detail={<List.Item.Detail markdown={getResultMarkdown(result)} />}
            actions={
              <ActionPanel>
                {preferredPdfLink ? (
                  <Action.OpenInBrowser
                    title={preferredPdfLink.title}
                    icon={Icon.Document}
                    url={preferredPdfLink.url}
                  />
                ) : null}
                <Action.OpenInBrowser
                  title="Open Symbol Explorer"
                  icon={Icon.Globe}
                  url={getSymbolExplorerUrl(result)}
                />
                {additionalDocumentLinks.map((link) => (
                  <Action.OpenInBrowser key={link.url} title={link.title} icon={Icon.Document} url={link.url} />
                ))}
                <Action.CopyToClipboard title="Copy Symbol" content={result.symbol} />
                {preferredPdfLink ? (
                  <Action.CopyToClipboard title="Copy Default PDF Link" content={preferredPdfLink.url} />
                ) : null}
                <Action.Push
                  title="View Search Payload"
                  icon={Icon.Document}
                  target={<SearchPayloadDetail payload={props.payload} subjects={props.subjects} />}
                />
                <Action title="Refresh Results" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action title="Edit Search Form" icon={Icon.Pencil} onAction={props.onEditSearch} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function UnDocumentsCommand() {
  const [submittedPayload, setSubmittedPayload] = useState<DocumentsUnSearchPayload>();
  const [lastSubmittedValues, setLastSubmittedValues] = useState(defaultFormValues);
  const { data: subjects = [], isLoading, error, revalidate } = usePromise(fetchDocumentsUnSubjects);

  const handleSubmit = async (values: DocumentsUnSearchFormValues) => {
    const hasPrimaryCriteria = [values.symbol, values.title, values.jobNumber, values.fullTextSearchText].some(
      (value) => value.trim().length > 0,
    );

    if (!hasPrimaryCriteria) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter at least one search criterion",
        message: "Use Symbol, Title, Job Number, or Full Text.",
      });
      return;
    }

    if (
      values.publicationDateFrom &&
      values.publicationDateTo &&
      values.publicationDateFrom > values.publicationDateTo
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Publication date range is invalid",
        message: "The start date must be earlier than the end date.",
      });
      return;
    }

    if (values.releaseDateFrom && values.releaseDateTo && values.releaseDateFrom > values.releaseDateTo) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Release date range is invalid",
        message: "The start date must be earlier than the end date.",
      });
      return;
    }

    setLastSubmittedValues(values);
    setSubmittedPayload(buildSearchPayload(values, subjects));
  };

  if (submittedPayload) {
    return (
      <SearchResultsList
        payload={submittedPayload}
        subjects={subjects}
        onEditSearch={() => setSubmittedPayload(undefined)}
      />
    );
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Documents" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          {error ? <Action title="Retry Loading Subjects" icon={Icon.ArrowClockwise} onAction={revalidate} /> : null}
        </ActionPanel>
      }
    >
      <Form.TextField id="symbol" title="Symbol" placeholder="A/RES/70/1" defaultValue={lastSubmittedValues.symbol} />
      <Form.Dropdown id="truncation" title="Truncation" defaultValue={lastSubmittedValues.truncation}>
        <Form.Dropdown.Item value="right" title="Right" />
        <Form.Dropdown.Item value="left" title="Left" />
        <Form.Dropdown.Item value="both" title="Both" />
        <Form.Dropdown.Item value="none" title="None" />
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="Words in title" defaultValue={lastSubmittedValues.title} />
      <Form.TextField
        id="jobNumber"
        title="Job Number"
        placeholder="N1529187"
        defaultValue={lastSubmittedValues.jobNumber}
      />
      <Form.TextField id="session" title="Session / Year" placeholder="70" defaultValue={lastSubmittedValues.session} />
      <Form.TextField
        id="agenda"
        title="Agenda Item No."
        placeholder="15 116"
        defaultValue={lastSubmittedValues.agenda}
      />

      <Form.Separator />

      <Form.TagPicker
        id="subjectCodes"
        title="Subjects"
        placeholder="Select subjects"
        defaultValue={lastSubmittedValues.subjectCodes}
      >
        {subjects.map((subject) => (
          <Form.TagPicker.Item key={subject.code} value={subject.code} title={subject.title} />
        ))}
      </Form.TagPicker>
      <Form.Description
        title="Subjects Status"
        text={
          error
            ? "Could not load subject options. You can leave this field empty for now."
            : isLoading
              ? "Loading subject options from documents.un.org..."
              : `Loaded ${subjects.length} subject options.`
        }
      />

      <Form.Separator />

      <Form.DatePicker
        id="publicationDateFrom"
        title="Publication Date From"
        type={Form.DatePicker.Type.Date}
        defaultValue={lastSubmittedValues.publicationDateFrom}
      />
      <Form.DatePicker
        id="publicationDateTo"
        title="Publication Date To"
        type={Form.DatePicker.Type.Date}
        defaultValue={lastSubmittedValues.publicationDateTo}
      />
      <Form.DatePicker
        id="releaseDateFrom"
        title="Release Date From"
        type={Form.DatePicker.Type.Date}
        defaultValue={lastSubmittedValues.releaseDateFrom}
      />
      <Form.DatePicker
        id="releaseDateTo"
        title="Release Date To"
        type={Form.DatePicker.Type.Date}
        defaultValue={lastSubmittedValues.releaseDateTo}
      />

      <Form.Separator />

      <Form.TextArea
        id="fullTextSearchText"
        title="Full Text"
        placeholder="Enter text to search in document content"
        defaultValue={lastSubmittedValues.fullTextSearchText}
      />
      <Form.Checkbox
        id="fullTextSearchExact"
        label="Fuzzy Search"
        defaultValue={lastSubmittedValues.fullTextSearchExact}
      />
      <Form.Dropdown
        id="fullTextSearchLanguage"
        title="Full Text Language"
        defaultValue={lastSubmittedValues.fullTextSearchLanguage}
      >
        {documentsUnFullTextLanguages.map((language) => (
          <Form.Dropdown.Item key={language.code || "all"} value={language.code} title={language.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="fullTextSearchType"
        title="Full Text Match Type"
        defaultValue={lastSubmittedValues.fullTextSearchType}
      >
        <Form.Dropdown.Item value="Find this phrase" title="Find this phrase" />
        <Form.Dropdown.Item value="Find all words" title="Find all words" />
        <Form.Dropdown.Item value="Find any words" title="Find any words" />
        <Form.Dropdown.Item value="Use boolean operators" title="Use boolean operators" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown id="sortField" title="Sort By" defaultValue={lastSubmittedValues.sortField}>
        <Form.Dropdown.Item value="Sort by relevance" title="Sort by relevance" />
        <Form.Dropdown.Item value="Sort by date - descending" title="Sort by date - descending" />
        <Form.Dropdown.Item value="Sort by date - ascending" title="Sort by date - ascending" />
        <Form.Dropdown.Item value="Sort by symbol" title="Sort by symbol" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Search form mapped from the current documents.un.org advanced search page." />
    </Form>
  );
}
