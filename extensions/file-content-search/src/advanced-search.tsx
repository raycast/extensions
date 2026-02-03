import { homedir } from "node:os";
import { Action, ActionPanel, Form, Icon, List } from "@raycast/api";
import { type FC, useCallback, useRef, useState } from "react";
import { GrepResultsList } from "./components";
import { MAX_RESULTS_OPTIONS, TIMEOUT_OPTIONS } from "./constants";
import { useConfig, useGrep, useHistory } from "./hooks";
import type { Config, SearchOptions } from "./types";
import {
  buildGrepCommand,
  formatLocationName,
  type ToastInstance,
  toast,
  validateRegex,
} from "./utils";

type AdvancedSearchFormProps = {
  onSubmit: (values: SearchOptions) => void;
  initialConfig: Config;
  recentPatterns: string[];
};

type AdvancedSearchResultsProps = {
  searchOptions: SearchOptions;
  onBack: () => void;
};

const AdvancedSearchForm: FC<AdvancedSearchFormProps> = ({
  onSubmit,
  initialConfig,
  recentPatterns,
}) => {
  const [pattern, setPattern] = useState("");
  const [patternError, setPatternError] = useState<string | undefined>();
  const [useRegex, setUseRegex] = useState(initialConfig.useRegex);
  const [timeout, setTimeout] = useState(initialConfig.timeout.toString());
  const [maxResults, setMaxResults] = useState(initialConfig.maxResults.toString());

  const handlePatternChange = (value: string) => {
    setPattern(value);
    if (useRegex && value) {
      const validation = validateRegex(value);
      setPatternError(validation.isValid ? undefined : validation.error);
    } else {
      setPatternError(undefined);
    }
  };

  const handleRegexToggle = (value: boolean) => {
    setUseRegex(value);
    if (value && pattern) {
      const validation = validateRegex(pattern);
      setPatternError(validation.isValid ? undefined : validation.error);
    } else {
      setPatternError(undefined);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Search"
            icon={Icon.MagnifyingGlass}
            onSubmit={(values) => {
              if (values.useRegex) {
                const validation = validateRegex(values.pattern);
                if (!validation.isValid) {
                  setPatternError(validation.error);
                  return;
                }
              }

              onSubmit({
                pattern: values.pattern,
                searchPath: values.searchPath?.[0] || homedir(),
                useRegex: values.useRegex,
                timeout: parseInt(values.timeout, 10),
                maxResults: parseInt(values.maxResults, 10),
              });
            }}
          />
          <Action
            title="Clear Form"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            onAction={() => {
              setPattern("");
              setPatternError(undefined);
            }}
          />
          {recentPatterns.length > 0 && (
            <ActionPanel.Section title="Recent Searches">
              {recentPatterns.slice(0, 3).map((recentPattern, index) => (
                <Action
                  key={recentPattern}
                  title={`Use: ${recentPattern.slice(0, 50)}${recentPattern.length > 50 ? "..." : ""}`}
                  icon={Icon.Clock}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: (index + 1).toString() as "1" | "2" | "3",
                  }}
                  onAction={() => setPattern(recentPattern)}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="pattern"
        title="Search Pattern"
        placeholder={useRegex ? "Enter regex pattern..." : "Enter search text..."}
        value={pattern}
        onChange={handlePatternChange}
        error={patternError}
        info={useRegex ? "RegExp pattern for matching file content" : "Plain text to search for"}
      />

      <Form.FilePicker
        id="searchPath"
        title="Search Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={[initialConfig.searchPath]}
      />

      <Form.Separator />

      <Form.Checkbox
        id="useRegex"
        label="Use Regular Expression"
        value={useRegex}
        onChange={handleRegexToggle}
        info="Enable regex pattern matching"
      />

      <Form.Dropdown id="timeout" title="Search Timeout" value={timeout} onChange={setTimeout}>
        {TIMEOUT_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="maxResults"
        title="Max Results"
        value={maxResults}
        onChange={setMaxResults}
      >
        {MAX_RESULTS_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Description text="Configure your search parameters and press Enter to start searching." />
    </Form>
  );
};

const AdvancedSearchResults: FC<AdvancedSearchResultsProps> = ({ searchOptions, onBack }) => {
  const loadingToastRef = useRef<ToastInstance | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedId(Number(id));
  }, []);

  const { data, isLoading } = useGrep(
    buildGrepCommand(searchOptions.pattern, {
      path: searchOptions.searchPath,
      useRegex: searchOptions.useRegex,
      maxResults: searchOptions.maxResults,
    }),
    {
      execute: true,
      timeout: searchOptions.timeout * 1000,
      maxResults: searchOptions.maxResults,
      onStart: (cancel) => {
        toast
          .loading({
            title: "Searching...",
            message: "Press ⌘. to cancel",
            onCancel: cancel,
          })
          .then((t) => {
            loadingToastRef.current = t;
          });
      },
      onLoad: () => {
        loadingToastRef.current?.hide();
        toast.success("Search completed");
      },
      onError: (err) => {
        loadingToastRef.current?.hide();
        toast.error("Search failed", err.message);
      },
      onTimeout: () => {
        loadingToastRef.current?.hide();
        toast.error("Search timed out");
      },
    },
  );

  const locationName = formatLocationName(searchOptions.searchPath);

  const renderResultsContent = () => {
    if (data.length === 0 && !isLoading) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results Found"
          description={`No matches for "${searchOptions.pattern}"\nSearching in: ${searchOptions.searchPath}`}
          actions={
            <ActionPanel>
              <Action title="Back to Form" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      );
    }
    return <GrepResultsList entries={data} selectedId={selectedId} />;
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={data.length > 0}
      searchBarPlaceholder={`Results for "${searchOptions.pattern}" in ${locationName}`}
      navigationTitle="Advanced Search Results"
      onSelectionChange={handleSelectionChange}
    >
      {renderResultsContent()}
    </List>
  );
};

export default function AdvancedSearchCommand() {
  const [searchOptions, setSearchOptions] = useState<SearchOptions | null>(null);
  const { config } = useConfig();
  const { history } = useHistory();

  const recentPatterns = history.slice(0, 3).map((h) => h.pattern);

  if (searchOptions) {
    return (
      <AdvancedSearchResults searchOptions={searchOptions} onBack={() => setSearchOptions(null)} />
    );
  }

  return (
    <AdvancedSearchForm
      onSubmit={setSearchOptions}
      initialConfig={config}
      recentPatterns={recentPatterns}
    />
  );
}
