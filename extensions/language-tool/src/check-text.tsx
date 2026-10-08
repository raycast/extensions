import {
  ActionPanel,
  Action,
  Form,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import {
  useFetch,
  useCachedState,
  useForm,
  FormValidation,
  useFrecencySorting,
} from "@raycast/utils";
import type { Language } from "./types";
import { CheckTextResult } from "./components";
import { API_ENDPOINTS } from "./config/api";
import { checkTextWithAPI } from "./services/languagetool-api";

type FormValues = {
  language: string;
  text: string;
  // Advanced options (optional in form, but come from preferences)
  motherTongue?: string;
  preferredVariants?: string;
  level?: "" | "default" | "picky";
  enabledRules?: string;
  disabledRules?: string;
  enabledCategories?: string;
  disabledCategories?: string;
  enabledOnly?: boolean;
  enableHiddenRules?: boolean;
  noopLanguages?: string;
  abtest?: string;
  mode?: "" | "allButTextLevelOnly" | "textLevelOnly";
  allowIncompleteResults?: boolean;
  useragent?: "" | "standalone";
};

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  // Persist selected language between executions
  const [selectedLanguage, setSelectedLanguage] = useCachedState<string>(
    "selected-language",
    "en-US",
  );

  // Fetch languages with automatic cache
  const { data: languages, isLoading: loadingLanguages } = useFetch<Language[]>(
    API_ENDPOINTS.LANGUAGES,
  );

  // Sort languages by frequency of use (most used appear first!)
  const { data: sortedLanguages, visitItem } = useFrecencySorting(
    languages || [],
    {
      key: (lang) => lang.longCode,
    },
  );

  // Form with validation
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      // Register language usage for sorting
      const lang = languages?.find((l) => l.longCode === values.language);
      if (lang) visitItem(lang);

      try {
        // Use centralized service (includes Premium credentials automatically)
        // Form values take priority, but fallback to preferences if not filled
        const request = {
          data: JSON.stringify({ text: values.text }),
          language: values.language,
          // Advanced options: use form if filled, otherwise use preferences
          motherTongue: values.motherTongue || preferences.motherTongue,
          preferredVariants:
            values.preferredVariants || preferences.preferredVariants,
          level: values.level || preferences.level,
          enabledRules: values.enabledRules || preferences.enabledRules,
          disabledRules: values.disabledRules || preferences.disabledRules,
          enabledCategories:
            values.enabledCategories || preferences.enabledCategories,
          disabledCategories:
            values.disabledCategories || preferences.disabledCategories,
          enabledOnly: values.enabledOnly ?? preferences.enabledOnly,
          enableHiddenRules:
            values.enableHiddenRules ?? preferences.enableHiddenRules,
          noopLanguages: values.noopLanguages || preferences.noopLanguages,
          abtest: values.abtest || preferences.abtest,
          mode: values.mode || preferences.mode,
          allowIncompleteResults:
            values.allowIncompleteResults ?? preferences.allowIncompleteResults,
          useragent: values.useragent || preferences.useragent,
        };

        const result = await checkTextWithAPI(request);

        push(<CheckTextResult result={result} textChecked={values.text} />);
      } catch (error) {
        console.error("Error checking text:", error);
        throw error;
      }
    },
    validation: {
      language: FormValidation.Required,
      text: (value) => {
        if (!value || value.trim().length === 0) {
          return "Text is required";
        } else if (value.trim().length < 3) {
          return "Text must be at least 3 characters";
        }
      },
    },
    initialValues: {
      language: selectedLanguage,
      text: "",
      // Initial values come from preferences
      motherTongue: preferences.motherTongue || "",
      preferredVariants: preferences.preferredVariants || "",
      level: preferences.level || "",
      enabledRules: preferences.enabledRules || "",
      disabledRules: preferences.disabledRules || "",
      enabledCategories: preferences.enabledCategories || "",
      disabledCategories: preferences.disabledCategories || "",
      enabledOnly: preferences.enabledOnly ?? false,
      enableHiddenRules: preferences.enableHiddenRules ?? true,
      noopLanguages: preferences.noopLanguages || "",
      abtest: preferences.abtest || "",
      mode: preferences.mode || "",
      allowIncompleteResults: preferences.allowIncompleteResults ?? true,
      useragent: preferences.useragent || "standalone",
    },
  });

  // Update persisted language when changed
  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    itemProps.language.onChange?.(newLanguage);
  };

  return (
    <Form
      isLoading={loadingLanguages}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check Text" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        title="Language"
        placeholder="Select a language"
        {...itemProps.language}
        onChange={handleLanguageChange}
      >
        <Form.Dropdown.Item key="auto" value="auto" title="Auto" />
        {sortedLanguages.map((lang) => (
          <Form.Dropdown.Item
            key={lang.longCode}
            value={lang.longCode}
            title={lang.name}
          />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        title="Text to check"
        placeholder="Type or paste your text here..."
        enableMarkdown={false}
        {...itemProps.text}
      />

      <Form.Description text={`${values.text?.length || 0} characters`} />

      {preferences.showAdvancedOptions && (
        <>
          <Form.Separator />

          <Form.Dropdown
            id="level"
            title="Check Level"
            info="Verification level: empty (default API behavior), 'default' (force standard mode), or 'picky' (stricter checking with additional rules for formal text)."
            value={values.level}
            onChange={(newValue) =>
              itemProps.level.onChange?.(
                newValue as "" | "default" | "picky" | undefined,
              )
            }
          >
            <Form.Dropdown.Item value="" title="--" />
            <Form.Dropdown.Item value="default" title="Default" />
            <Form.Dropdown.Item value="picky" title="Picky (More Strict)" />
          </Form.Dropdown>

          <Form.TextField
            title="Mother Tongue"
            placeholder="e.g., en-US"
            info="Native language for false friends checks"
            {...itemProps.motherTongue}
          />

          <Form.TextField
            title="Preferred Variants"
            placeholder="e.g., en-GB,de-AT"
            info="Preferred language variants when using auto-detection (comma-separated)"
            {...itemProps.preferredVariants}
          />

          <Form.TextField
            title="Enabled Rules"
            placeholder="e.g., RULE_ID_1,RULE_ID_2"
            info="Comma-separated list of rule IDs to enable"
            {...itemProps.enabledRules}
          />

          <Form.TextField
            title="Disabled Rules"
            placeholder="e.g., RULE_ID_1,RULE_ID_2"
            info="Comma-separated list of rule IDs to disable"
            {...itemProps.disabledRules}
          />

          <Form.TextField
            title="Enabled Categories"
            placeholder="e.g., CATEGORY_1,CATEGORY_2"
            info="Comma-separated list of category IDs to enable"
            {...itemProps.enabledCategories}
          />

          <Form.TextField
            title="Disabled Categories"
            placeholder="e.g., CATEGORY_1,CATEGORY_2"
            info="Comma-separated list of category IDs to disable"
            {...itemProps.disabledCategories}
          />

          <Form.Checkbox
            label="Enable Only Specified Rules"
            info="If checked, only rules specified in 'Enabled Rules' will be active"
            {...itemProps.enabledOnly}
          />

          <Form.Checkbox
            label="Enable Hidden Rules"
            info="If checked, enables hidden rules in the API"
            {...itemProps.enableHiddenRules}
          />

          <Form.TextField
            title="Noop Languages"
            placeholder="e.g., pt,en"
            info="Comma-separated list of language codes that should not be processed"
            {...itemProps.noopLanguages}
          />

          <Form.TextField
            title="A/B Test"
            placeholder="e.g., deggec,esggec,ptggec"
            info="A/B test configuration string for experimental features"
            {...itemProps.abtest}
          />

          <Form.Dropdown
            id="mode"
            title="Mode"
            info="API mode: empty (default), 'allButTextLevelOnly', or 'textLevelOnly'."
            value={values.mode}
            onChange={(newValue) =>
              itemProps.mode.onChange?.(
                newValue as
                  | ""
                  | "allButTextLevelOnly"
                  | "textLevelOnly"
                  | undefined,
              )
            }
          >
            <Form.Dropdown.Item value="" title="--" />
            <Form.Dropdown.Item
              value="allButTextLevelOnly"
              title="All But Text Level Only"
            />
            <Form.Dropdown.Item value="textLevelOnly" title="Text Level Only" />
          </Form.Dropdown>

          <Form.Checkbox
            label="Allow Incomplete Results"
            info="If checked, allows the API to return incomplete results"
            {...itemProps.allowIncompleteResults}
          />

          <Form.Dropdown
            id="useragent"
            title="User Agent"
            info="User agent configuration for API requests"
            value={values.useragent}
            onChange={(newValue) =>
              itemProps.useragent.onChange?.(
                newValue as "" | "standalone" | undefined,
              )
            }
          >
            <Form.Dropdown.Item value="standalone" title="Standalone" />
            <Form.Dropdown.Item value="" title="--" />
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
