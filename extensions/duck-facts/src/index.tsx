import { Detail, Action, ActionPanel, AI, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useRef } from "react";

export default function Command() {
  const [answer, setAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const hasRunEffect = useRef(false);

  const prompt = `
  Generate a fact about ducks. Use internet wherever possible.
  Do not say before or after the fact.
  Do not say "Fact: " or "Here is a fact: " or anything like that. Just give me the fact.
  `;

  const model_settings = {
    model: AI.Model["OpenAI_GPT3.5-turbo"],
    creativity: "high" as const,
  };

  const fetchData = async () => {
    setIsLoading(true);
    setAnswer("");
    try {
      const aiResult = await AI.ask(prompt, model_settings);

      for await (const data of aiResult) {
        setAnswer((prevAnswer) => prevAnswer + data);
      }
    } catch (error) {
      console.error("Error:", error);
      showToast(Toast.Style.Failure, "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasRunEffect.current) {
      fetchData();
      hasRunEffect.current = true;
    }
  }, []);

  return (
    <Detail
      markdown={isLoading ? "Generating..." : answer || "No suggestions generated"}
      actions={
        <ActionPanel>
          <Action title="Regenerate Suggestions" onAction={fetchData} />
        </ActionPanel>
      }
    />
  );
}
