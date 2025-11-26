import { ActionPanel, Action, Form, useNavigation, getPreferenceValues } from "@raycast/api";
import { useFetch, useCachedState, useForm, FormValidation, useFrecencySorting } from "@raycast/utils";
import type { Language } from "./types";
import { CheckTextResult } from "./components";
import { API_ENDPOINTS } from "./config/api";
import { checkTextWithAPI } from "./services/languagetool-api";

interface Preferences {
  showAdvancedOptions?: boolean;
  motherTongue?: string;
  preferredVariants?: string;
  level?: "" | "default" | "picky";
  enabledRules?: string;
  disabledRules?: string;
  enabledCategories?: string;
  disabledCategories?: string;
  enabledOnly?: boolean;
}

interface FormValues {
  language: string;
  "text-to-check": string;
  // Opções avançadas (opcionais no form, mas vêm das preferências)
  motherTongue?: string;
  preferredVariants?: string;
  level?: "" | "default" | "picky";
  enabledRules?: string;
  disabledRules?: string;
  enabledCategories?: string;
  disabledCategories?: string;
  enabledOnly?: boolean;
}

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  // Persistir idioma selecionado entre execuções
  const [selectedLanguage, setSelectedLanguage] = useCachedState<string>("selected-language", "en-US");

  // Buscar idiomas com cache automático
  const { data: languages, isLoading: loadingLanguages } = useFetch<Language[]>(API_ENDPOINTS.LANGUAGES);

  // Ordenar idiomas por frequência de uso (mais usados aparecem primeiro!)
  const { data: sortedLanguages, visitItem } = useFrecencySorting(languages || [], {
    key: (lang) => lang.longCode,
  });

  // Form com validação
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      // Registra o uso do idioma para sorting
      const lang = languages?.find((l) => l.longCode === values.language);
      if (lang) visitItem(lang);

      try {
        // Usa serviço centralizado (inclui credenciais Premium automaticamente)
        // Valores do form têm prioridade, mas fallback para preferências se não preenchido
        const result = await checkTextWithAPI({
          text: values["text-to-check"],
          language: values.language,
          // Opções avançadas: usa form se preenchido, senão usa preferências
          motherTongue: values.motherTongue || preferences.motherTongue,
          preferredVariants: values.preferredVariants || preferences.preferredVariants,
          level: values.level || preferences.level,
          enabledRules: values.enabledRules || preferences.enabledRules,
          disabledRules: values.disabledRules || preferences.disabledRules,
          enabledCategories: values.enabledCategories || preferences.enabledCategories,
          disabledCategories: values.disabledCategories || preferences.disabledCategories,
          enabledOnly: values.enabledOnly ?? preferences.enabledOnly,
        });

        // Navega para a tela de resultados
        push(<CheckTextResult result={result} textChecked={values["text-to-check"]} />);
      } catch (error) {
        console.error("Erro ao verificar texto:", error);
        throw error;
      }
    },
    validation: {
      language: FormValidation.Required,
      "text-to-check": (value) => {
        if (!value || value.trim().length === 0) {
          return "Text is required";
        } else if (value.trim().length < 3) {
          return "Text must be at least 3 characters";
        }
      },
    },
    initialValues: {
      language: selectedLanguage,
      "text-to-check": "",
      // Valores iniciais vêm das preferências
      motherTongue: preferences.motherTongue || "",
      preferredVariants: preferences.preferredVariants || "",
      level: preferences.level || "",
      enabledRules: preferences.enabledRules || "",
      disabledRules: preferences.disabledRules || "",
      enabledCategories: preferences.enabledCategories || "",
      disabledCategories: preferences.disabledCategories || "",
      enabledOnly: preferences.enabledOnly || false,
    },
  });

  // Atualiza idioma persistido quando mudar
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
        {sortedLanguages.map((lang) => (
          <Form.Dropdown.Item key={lang.longCode} value={lang.longCode} title={lang.name} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        title="Text to check"
        placeholder="Type or paste your text here..."
        enableMarkdown={false}
        {...itemProps["text-to-check"]}
      />

      <Form.Description text={`${values["text-to-check"]?.length || 0} characters`} />

      {preferences.showAdvancedOptions && (
        <>
          <Form.Separator />

          <Form.Dropdown
            id="level"
            title="Check Level"
            info="Verification level: empty (default API behavior), 'default' (force standard mode), or 'picky' (stricter checking with additional rules for formal text)."
            value={values.level}
            onChange={(newValue) => itemProps.level.onChange?.(newValue as "" | "default" | "picky" | undefined)}
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
        </>
      )}
    </Form>
  );
}
