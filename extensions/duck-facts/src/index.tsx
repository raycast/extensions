import { Detail, Action, ActionPanel, AI, showToast, Toast, environment, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [answer, setAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  if (!environment.canAccess(AI)) {
    popToRoot();
    showToast({
      style: Toast.Style.Failure,
      title: "This command requires a PRO subscription.",
    });
    return;
  }

  const prompt = `
  Generate a fact about ducks. Use internet wherever possible.
  Do not say something before the fact.
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
    fetchData();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={isLoading ? "Generating..." : answer || "No duck fact found"}
      actions={
        <ActionPanel>
          <Action title="New Fact" icon="duck.svg" onAction={fetchData} />
        </ActionPanel>
      }
    />
  );
}
