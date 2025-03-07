import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AIModelEnum } from "./constants/aiModels";
import { LocalStorage } from "@raycast/api";

// Interface para as preferências da extensão
export interface Preferences {
  defaultLanguage: string;
  defaultModel: string;
  defaultDifficultyLevel: string;
  enhancementPrompt: string;
  enhancementModel: string;
  maxTags: number;
}

// Valores padrão para as preferências
const DEFAULT_PREFERENCES: Preferences = {
  defaultLanguage: "português",
  defaultModel: AIModelEnum.GPT4o,
  defaultDifficultyLevel: "intermediário",
  enhancementPrompt:
    "Melhore este flashcard mantendo a ideia principal, mas tornando a pergunta mais clara e a resposta mais completa e didática. Mantenha as informações extras relevantes.",
  enhancementModel: AIModelEnum.GPT4o,
  maxTags: 2,
};

// Chave para armazenar as preferências personalizadas
const CUSTOM_PREFERENCES_KEY = "anki_ai_custom_preferences";

// Função para obter as preferências (combinando as definidas pelo Raycast com as personalizadas)
export async function getCustomPreferences(): Promise<Preferences> {
  try {
    // Obter as preferências definidas pelo Raycast
    const raycastPrefs = getPreferenceValues<Preferences>();

    // Obter as preferências personalizadas armazenadas
    const storedPrefsString = await LocalStorage.getItem(CUSTOM_PREFERENCES_KEY);
    const storedPrefs = storedPrefsString ? JSON.parse(storedPrefsString) : {};

    // Combinar as preferências, com prioridade para as personalizadas
    return { ...DEFAULT_PREFERENCES, ...raycastPrefs, ...storedPrefs };
  } catch (error) {
    console.error("Erro ao obter preferências:", error);
    return { ...DEFAULT_PREFERENCES, ...getPreferenceValues<Preferences>() };
  }
}

// Função para salvar preferências personalizadas
export async function saveCustomPreferences(preferences: Partial<Preferences>): Promise<void> {
  try {
    // Obter as preferências personalizadas atuais
    const storedPrefsString = await LocalStorage.getItem(CUSTOM_PREFERENCES_KEY);
    const currentPrefs = storedPrefsString ? JSON.parse(storedPrefsString) : {};

    // Atualizar com as novas preferências
    const updatedPrefs = { ...currentPrefs, ...preferences };

    // Salvar as preferências atualizadas
    await LocalStorage.setItem(CUSTOM_PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.error("Erro ao salvar preferências:", error);
    throw error;
  }
}

// Componente para editar as preferências
export default function PreferencesCommand() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar as preferências ao iniciar
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getCustomPreferences();
        setPreferences(prefs);
      } catch (error) {
        console.error("Erro ao carregar preferências:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Função para salvar as alterações
  const handleSubmit = async (values: Preferences) => {
    try {
      await saveCustomPreferences(values);
      showToast({ style: Toast.Style.Success, title: "Preferências salvas com sucesso" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao salvar preferências",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  // Lista de modelos de IA disponíveis
  const aiModels = [
    // Raycast
    { value: AIModelEnum.RAY1, label: "Ray1" },
    { value: AIModelEnum.RAY1_MINI, label: "Ray1 Mini" },

    // OpenAI
    { value: AIModelEnum.GPT3_5, label: "GPT-3.5 Turbo" },
    { value: AIModelEnum.GPT4, label: "GPT-4" },
    { value: AIModelEnum.GPT4_TURBO, label: "GPT-4 Turbo" },
    { value: AIModelEnum.GPT4o, label: "GPT-4o (Recomendado)" },
    { value: AIModelEnum.GPT4o_MINI, label: "GPT-4o Mini (Mais rápido)" },
    { value: AIModelEnum.O1, label: "OpenAI O1" },
    { value: AIModelEnum.O1_MINI, label: "OpenAI O1 Mini" },
    { value: AIModelEnum.O3_MINI, label: "OpenAI O3 Mini" },

    // Claude
    { value: AIModelEnum.CLAUDE3_5_HAIKU, label: "Claude 3.5 Haiku" },
    { value: AIModelEnum.CLAUDE3_5_SONNET, label: "Claude 3.5 Sonnet" },
    { value: AIModelEnum.CLAUDE3_7_SONNET, label: "Claude 3.7 Sonnet" },
    { value: AIModelEnum.CLAUDE3_OPUS, label: "Claude 3 Opus (Alta complexidade)" },
    { value: AIModelEnum.CLAUDE3_SONNET, label: "Claude 3 Sonnet (Balanceado)" },
    { value: AIModelEnum.CLAUDE3_HAIKU, label: "Claude 3 Haiku (Mais rápido)" },
  ];

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Salvar Preferências" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Configurações Gerais"
        text="Configure as preferências padrão para a geração de flashcards"
      />

      <Form.Dropdown
        id="defaultModel"
        title="Modelo de IA Padrão"
        value={preferences.defaultModel}
        onChange={(value) => setPreferences({ ...preferences, defaultModel: value })}
      >
        {aiModels.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="defaultLanguage"
        title="Idioma Padrão"
        value={preferences.defaultLanguage}
        onChange={(value) => setPreferences({ ...preferences, defaultLanguage: value })}
      >
        <Form.Dropdown.Item value="português" title="Português" />
        <Form.Dropdown.Item value="english" title="English" />
        <Form.Dropdown.Item value="español" title="Español" />
      </Form.Dropdown>

      <Form.Dropdown
        id="defaultDifficultyLevel"
        title="Nível de Dificuldade Padrão"
        value={preferences.defaultDifficultyLevel}
        onChange={(value) => setPreferences({ ...preferences, defaultDifficultyLevel: value })}
      >
        <Form.Dropdown.Item value="iniciante" title="Iniciante 🟢" />
        <Form.Dropdown.Item value="intermediário" title="Intermediário 🟡" />
        <Form.Dropdown.Item value="avançado" title="Avançado 🔴" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Configurações de Aprimoramento"
        text="Configure como os flashcards são aprimorados pela IA"
      />

      <Form.TextArea
        id="enhancementPrompt"
        title="Prompt de Aprimoramento"
        placeholder="Instruções para a IA melhorar os flashcards"
        value={preferences.enhancementPrompt}
        onChange={(value) => setPreferences({ ...preferences, enhancementPrompt: value })}
      />

      <Form.Dropdown
        id="enhancementModel"
        title="Modelo para Aprimoramento"
        value={preferences.enhancementModel}
        onChange={(value) => setPreferences({ ...preferences, enhancementModel: value })}
      >
        {aiModels.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.label} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description title="Configurações de Tags" text="Configure como as tags são geradas e gerenciadas" />

      <Form.TextField
        id="maxTags"
        title="Número Máximo de Tags"
        placeholder="Número máximo de tags por flashcard"
        value={String(preferences.maxTags)}
        onChange={(value) => {
          const num = parseInt(value);
          if (!isNaN(num) && num > 0) {
            setPreferences({ ...preferences, maxTags: num });
          }
        }}
      />
    </Form>
  );
}
