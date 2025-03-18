import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  LocalStorage,
  Toast,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";

// Constants for URL generation
const URL_CONFIG = {
  PRODUCTION_BASE_URL: "https://dashboards.tw.ee/explore",
  STAGING_BASE_URL: "https://test-dashboards.tw.ee/explore",
  DATASOURCE_UID: "P8AB12B8B65EF59AE",
  DEFAULT_TIME_RANGE: { from: "now-3h", to: "now" },
};

interface LokiQueryFormValues {
  serviceName: string;
  searchWords: string;
  ignoreCase: boolean;
  logLevels: string[];
  environment: string;
}

// Storage keys for saving user preferences
const STORAGE_KEYS = {
  SERVICE_NAME: "logwise.serviceName",
  SEARCH_WORDS: "logwise.searchWords",
  IGNORE_CASE: "logwise.ignoreCase",
  LOG_LEVELS: "logwise.logLevels",
  ENVIRONMENT: "logwise.environment",
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true); // Set to true to wait for data loading
  const { pop } = useNavigation();

  // Form field value state
  const [formValues, setFormValues] = useState<LokiQueryFormValues>({
    serviceName: "",
    searchWords: "",
    logLevels: ["ERROR"],
    environment: "production",
    ignoreCase: false,
  });

  // Form validation state
  const [serviceNameError, setServiceNameError] = useState<string | undefined>();
  const [searchWordsError, setSearchWordsError] = useState<string | undefined>();
  const [logLevelsError, setLogLevelsError] = useState<string | undefined>();

  // Load saved values when component mounts
  useEffect(() => {
    async function loadSavedValues() {
      try {
        console.log("Load from local storage:");

        const serviceName = await LocalStorage.getItem<string>(STORAGE_KEYS.SERVICE_NAME);
        const searchWords = await LocalStorage.getItem<string>(STORAGE_KEYS.SEARCH_WORDS);
        const ignoreCaseStr = await LocalStorage.getItem<string>(STORAGE_KEYS.IGNORE_CASE);
        const logLevelsStr = await LocalStorage.getItem<string>(STORAGE_KEYS.LOG_LEVELS);
        const environment = await LocalStorage.getItem<string>(STORAGE_KEYS.ENVIRONMENT);

        console.log("Load from local storage:", {
          serviceName,
          searchWords,
          ignoreCaseStr,
          logLevelsStr,
          environment,
        });

        // Constructing new default values
        const newDefaultValues = {
          serviceName: serviceName || "",
          searchWords: searchWords || "",
          ignoreCase: ignoreCaseStr === "true",
          logLevels: logLevelsStr ? JSON.parse(logLevelsStr) : ["ERROR"],
          environment: environment || "production",
        };

        console.log("Setting new default values:", newDefaultValues);
        setFormValues(newDefaultValues);
      } catch (error) {
        console.error("Load Error values:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSavedValues();
  }, []);

  function validateServiceName(value: string) {
    if (!value.trim()) {
      setServiceNameError("Service name is required");
      return false;
    }
    setServiceNameError(undefined);
    return true;
  }

  function validateSearchWords(value: string) {
    if (!value.trim()) {
      setSearchWordsError("Search words are required");
      return false;
    }
    setSearchWordsError(undefined);
    return true;
  }

  function validateLogLevels(values: string[]) {
    if (values.length === 0) {
      setLogLevelsError("At least one log level must be selected");
      return false;
    }
    setLogLevelsError(undefined);
    return true;
  }

  async function saveValues(values: LokiQueryFormValues) {
    try {
      console.log("Save value LocalStorage:", values);

      await LocalStorage.setItem(STORAGE_KEYS.SERVICE_NAME, values.serviceName);
      await LocalStorage.setItem(STORAGE_KEYS.SEARCH_WORDS, values.searchWords);
      await LocalStorage.setItem(STORAGE_KEYS.IGNORE_CASE, String(values.ignoreCase));
      await LocalStorage.setItem(STORAGE_KEYS.LOG_LEVELS, JSON.stringify(values.logLevels));
      await LocalStorage.setItem(STORAGE_KEYS.ENVIRONMENT, values.environment);

      console.log("Values successfully saved to LocalStorage");
    } catch (error) {
      console.error("Failed to save values:", error);
      throw error;
    }
  }

  async function handleSubmit(values: LokiQueryFormValues) {
    try {
      setIsLoading(true);

      // Validate all inputs
      const isServiceNameValid = validateServiceName(values.serviceName);
      const isSearchWordsValid = validateSearchWords(values.searchWords);
      const isLogLevelsValid = validateLogLevels(values.logLevels);

      if (!isServiceNameValid || !isSearchWordsValid || !isLogLevelsValid) {
        setIsLoading(false);
        return;
      }

      // Save values to LocalStorage
      await saveValues(values);

      // Generate LOKI query
      const query = generateLokiQuery(values);

      // Generate dashboard URL
      const dashboardUrl = generateDashboardUrl(query, values.environment);

      // Copy query to clipboard
      await Clipboard.copy(query);

      // Show toast with query details
      await showToast({
        style: Toast.Style.Success,
        title: "Query Copied to Clipboard",
        message: "Opening dashboard in browser",
      });

      // Open dashboard URL in browser
      await open(dashboardUrl);

      // Close the form after successful submission
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to generate query: ${error}`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Show Loading if still loading
  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Loki Query" onSubmit={handleSubmit} icon={Icon.Document} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField
        id="serviceName"
        title="Service Name"
        placeholder="Enter service name (e.g dd-case)"
        info="This corresponds to the namespace in the query"
        autoFocus={true}
        error={serviceNameError}
        value={formValues.serviceName}
        onChange={(value) => {
          validateServiceName(value);
          setFormValues((prev) => ({ ...prev, serviceName: value }));
        }}
      />

      <Form.TextField
        id="searchWords"
        title="Search Words"
        placeholder="Enter search pattern"
        info="Text to search in the logs"
        error={searchWordsError}
        value={formValues.searchWords}
        onChange={(value) => {
          validateSearchWords(value);
          setFormValues((prev) => ({ ...prev, searchWords: value }));
        }}
      />

      <Form.TagPicker
        id="logLevels"
        title="Log Levels"
        info="Select one or more log levels"
        error={logLevelsError}
        value={formValues.logLevels}
        onChange={(values) => {
          validateLogLevels(values);
          setFormValues((prev) => ({ ...prev, logLevels: values }));
        }}
      >
        <Form.TagPicker.Item value="INFO" title="INFO" icon={{ source: Icon.CircleFilled, tintColor: Color.Green }} />
        <Form.TagPicker.Item value="WARN" title="WARN" icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }} />
        <Form.TagPicker.Item value="ERROR" title="ERROR" icon={{ source: Icon.CircleFilled, tintColor: Color.Red }} />
      </Form.TagPicker>

      <Form.Dropdown
        id="environment"
        title="Environment"
        info="Select the environment for the dashboard"
        value={formValues.environment}
        onChange={(value) => {
          setFormValues((prev) => ({ ...prev, environment: value }));
        }}
      >
        <Form.Dropdown.Item value="production" title="Production" icon={Icon.Globe} />
        <Form.Dropdown.Item value="staging" title="Staging" icon={Icon.Hammer} />
      </Form.Dropdown>

      <Form.Checkbox
        id="ignoreCase"
        label="Ignore Case"
        title="Query Options"
        info="Add '(?i)' to make the search case-insensitive"
        value={formValues.ignoreCase}
        onChange={(value) => {
          setFormValues((prev) => ({ ...prev, ignoreCase: value }));
        }}
      />
    </Form>
  );
}

// Function to generate the LOKI query based on the form values
function generateLokiQuery(values: LokiQueryFormValues): string {
  // Base query structure
  let query = `{cluster=~".*", namespace="${values.serviceName}", container="service"}`;

  // Add search pattern with optional case-insensitive flag
  const caseFlag = values.ignoreCase ? "(?i)" : "";
  query += ` |~ "${caseFlag}${escapeRegexChars(values.searchWords)}"`;

  // Add JSON parser
  query += " | json";

  // Add log level filter
  if (values.logLevels.length > 0) {
    const logLevelPattern = values.logLevels.join("|");
    query += ` | level=~\`${logLevelPattern}\``;
  }

  // Add line formatting
  query += ' | line_format "{{._timestamp}} {{.stack_trace}} -- {{ default __line__ .message }}"';

  return query;
}

// Function to generate the dashboard URL
function generateDashboardUrl(query: string, environment: string): string {
  // Select the base URL based on environment
  const baseUrl = environment === "staging" ? URL_CONFIG.STAGING_BASE_URL : URL_CONFIG.PRODUCTION_BASE_URL;

  // Create URL object for better construction
  const url = new URL(baseUrl);

  // Build the panes parameter object
  const panesObject = {
    d9s: {
      datasource: URL_CONFIG.DATASOURCE_UID,
      queries: [
        {
          refId: "A",
          expr: query,
          queryType: "range",
          datasource: {
            type: "loki",
            uid: URL_CONFIG.DATASOURCE_UID,
          },
          editorMode: "code",
        },
      ],
      range: URL_CONFIG.DEFAULT_TIME_RANGE,
      panelsState: {
        logs: {
          visualisationType: "logs",
        },
      },
    },
  };

  // Set URL parameters
  url.searchParams.set("schemaVersion", "1");
  url.searchParams.set("panes", JSON.stringify(panesObject));
  url.searchParams.set("orgId", "1");

  return url.toString();
}

// Helper function to escape special regex characters in search string
function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
