import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  useNavigation,
} from "@raycast/api";
import { LLMService, LLMProvider } from "./llm-service";
import { Jurisprudence, ExtendedPreferences } from "./types";

interface LLMSummaryProps {
  jurisprudence: Jurisprudence;
  selectedProvider?: LLMProvider;
}

export function LLMSummary({ jurisprudence, selectedProvider }: LLMSummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentProvider, setCurrentProvider] = useState<LLMProvider | null>(
    selectedProvider || null
  );
  const preferences = getPreferenceValues<ExtendedPreferences>();
  const { pop } = useNavigation();

  const llmService = new LLMService({
    anthropicApiKey: preferences.anthropicApiKey,
    anthropicModel: preferences.anthropicModel,
    geminiApiKey: preferences.geminiApiKey,
    geminiModel: preferences.geminiModel,
    openaiApiKey: preferences.openaiApiKey,
    openaiModel: preferences.openaiModel,
    mistralApiKey: preferences.mistralApiKey,
    mistralModel: preferences.mistralModel,
    defaultLlm: preferences.defaultLlm,
  });

  const generateSummary = async (provider?: LLMProvider) => {
    setIsLoading(true);
    setSummary("");
    const selectedProvider = provider || (preferences.defaultLlm as LLMProvider) || "anthropic";
    setCurrentProvider(selectedProvider);

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Resumindo...",
        message: llmService.getProviderName(selectedProvider),
      });

      const result = await llmService.summarizeJurisprudence(jurisprudence, selectedProvider);
      console.log("Resultado recebido no componente:", result);

      if (!result || result.trim() === "" || result.includes("Erro")) {
        throw new Error(result || "Resposta vazia do LLM");
      }

      setSummary(result);

      showToast({
        style: Toast.Style.Success,
        title: "Concluído",
        message: llmService.getProviderName(selectedProvider),
      });
    } catch (error) {
      console.error("Erro ao gerar resumo:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao gerar resumo",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
      setSummary("❌ Erro ao gerar resumo. Verifique sua chave de API e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar resumo automaticamente quando o componente é montado
  useEffect(() => {
    generateSummary(selectedProvider);
  }, []);

  const availableProviders = llmService.getAvailableProviders();

  const markdown = `
# 🤖 Resumo Inteligente - ${jurisprudence.court_code}

${currentProvider ? `**🔥 Gerado por:** ${llmService.getProviderName(currentProvider)}${isLoading ? " (gerando...)" : ""}` : ""}

---

${summary || (isLoading ? "🤖 **Gerando resumo inteligente em tempo real...**\n\n*O resumo aparecerá aqui conforme é gerado pelo modelo de IA.*" : "⚠️ Nenhum resumo disponível.")}

${isLoading && summary ? "\n\n*✨ Continuando a gerar...*" : ""}

---

## 📋 Dados do Julgado

**📑 Título:** ${jurisprudence.title}
**🏛️ Tribunal:** ${jurisprudence.court_code}
**👨‍⚖️ Relator:** ${jurisprudence.trier || "N/A"}
**📅 Data:** ${jurisprudence.order_date ? new Date(jurisprudence.order_date).toLocaleDateString("pt-BR") : "N/A"}
**⚖️ Processo:** ${jurisprudence.cnj_unique_number || "N/A"}

${jurisprudence.rimor_url ? `🔗 [Ver documento completo no RIMOR](${jurisprudence.rimor_url})` : ""}
  `;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={`Resumo IA - ${jurisprudence.court_code}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Resumo IA">
            {availableProviders.map((provider) => (
              <Action
                key={provider}
                title={`Resumir com ${llmService.getProviderName(provider)}`}
                icon={llmService.getProviderIcon(provider)}
                onAction={() => generateSummary(provider)}
              />
            ))}
          </ActionPanel.Section>

          <ActionPanel.Section title="Ações">
            <Action.CopyToClipboard title="Copiar Resumo" content={summary} icon={Icon.Clipboard} />
            <Action.OpenInBrowser
              title="Abrir No Rimor"
              url={jurisprudence.rimor_url}
              icon={Icon.Globe}
            />
            <Action
              title="Voltar"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={pop}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Hook para verificar se há pelo menos um provedor LLM configurado
export function useLLMAvailable(): boolean {
  const preferences = getPreferenceValues<ExtendedPreferences>();

  return !!(
    preferences.anthropicApiKey ||
    preferences.geminiApiKey ||
    preferences.openaiApiKey ||
    preferences.mistralApiKey
  );
}
