import { useState, useEffect } from "react";
import { Detail } from "@raycast/api";
import FlashcardForm from "./components/FlashcardForm";
import { getRobustSelectedText } from "./utils/textUtil";
import { AIModule, getProviderConfig } from "./utils/providerUtil";

export default function QuickAddCommand() {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const text = await getRobustSelectedText();
        if (!text || text.trim().length === 0) {
          if (isMounted) setIsLoading(false);
          return; // just show empty form
        }

        const cleanText = text.trim();
        if (isMounted) setTerm(cleanText);

        const config = getProviderConfig();
        if (config.apiKey) {
          const ai = new AIModule(config);
          const rawResponse = await ai.defineWord(cleanText);
          try {
            const parsed = JSON.parse(
              rawResponse.replace(/```json/g, "").replace(/```/g, ""),
            );
            if (isMounted) {
              setDefinition(parsed.definition || rawResponse);
              if (parsed.example) {
                setExample(parsed.example);
              }
            }
          } catch (e) {
            // fallback if AI returns string
            if (isMounted) setDefinition(rawResponse);
          }
        }
        if (isMounted) setIsLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(String(err));
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <Detail isLoading={true} markdown="✨ Fetching definition via AI..." />
    );
  }

  if (error) {
    return <Detail markdown={`⚠️ Error: ${error}`} />;
  }

  return (
    <FlashcardForm
      initialTerm={term}
      initialDefinition={definition}
      initialExample={example}
    />
  );
}
