import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { ApiKeyManager } from "../utils/apiKeyManager";
import { GeminiFlashcardGenerator } from "../ai/geminiFlashcardGenerator";

export default function GeminiConfigScreen() {
  const [apiKey, setApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadApiKey() {
      try {
        const savedApiKey = await ApiKeyManager.getGeminiApiKey();
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
      } catch (error) {
        console.error("Erro ao carregar chave de API:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Erro ao carregar configuração",
          message: "Não foi possível carregar a chave de API",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadApiKey();
  }, []);

  async function handleSubmit(values: { apiKey: string }) {
    try {
      setIsLoading(true);

      await ApiKeyManager.saveGeminiApiKey(values.apiKey);

      showToast({
        style: Toast.Style.Success,
        title: "Configuração salva",
        message: "Chave de API do Gemini salva com sucesso",
      });
    } catch (error) {
      console.error("Erro ao salvar chave de API:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao salvar",
        message: "Não foi possível salvar a chave de API",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function testConnection() {
    try {
      setIsLoading(true);

      const isConnected = await GeminiFlashcardGenerator.testConnection();

      if (isConnected) {
        showToast({
          style: Toast.Style.Success,
          title: "Conexão bem-sucedida",
          message: "A API do Gemini está funcionando corretamente",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Falha na conexão",
          message: "Não foi possível conectar à API do Gemini",
        });
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Erro ao testar conexão",
        message: "Ocorreu um erro ao testar a conexão com a API",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Salvar Configuração" />
          <Action title="Testar Conexão" onAction={testConnection} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="apiKey"
        title="Chave de API do Gemini"
        placeholder="Insira sua chave de API do Google Gemini"
        value={apiKey}
        onChange={setApiKey}
        info="Você pode obter uma chave de API em https://ai.google.dev/"
      />
      <Form.Description
        title="Sobre o Google Gemini"
        text="O Google Gemini é um modelo de linguagem avançado que pode ser usado para gerar flashcards de alta qualidade. Para usar esta funcionalidade, você precisa de uma chave de API válida do Google AI Studio."
      />
    </Form>
  );
}
