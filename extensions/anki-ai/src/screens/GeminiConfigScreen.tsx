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
        console.error("Error loading API key:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Error loading configuration",
          message: "Could not load the API key",
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
        title: "Configuration saved",
        message: "Gemini API key saved successfully",
      });
    } catch (error) {
      console.error("Error saving API key:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error saving",
        message: "Could not save the API key",
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
          title: "Connection successful",
          message: "The Gemini API is working correctly",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Connection failed",
          message: "Could not connect to the Gemini API",
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error testing connection",
        message: "An error occurred while testing the connection to the API",
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
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Configuration" />
          <Action title="Test Connection" onAction={testConnection} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="apiKey"
        title="Gemini API Key"
        placeholder="Enter your Google Gemini API key"
        value={apiKey}
        onChange={setApiKey}
        info="You can get an API key at https://ai.google.dev/"
      />
      <Form.Description
        title="About Google Gemini"
        text="Google Gemini is an advanced language model that can be used to generate high-quality flashcards. To use this feature, you need a valid API key from Google AI Studio."
      />
    </Form>
  );
}
