import { Detail, getPreferenceValues, LaunchProps } from "@raycast/api";
import * as React from "react";
import { AnswerView } from "./lib/ui/AnswerView/main";
import { ChatView } from "./lib/ui/ChatView/main";
import { GetPromptTokenSelectionText } from "./lib/ui/AnswerView/function";
import { Creativity, ModelCapability } from "./lib/enum";
import { GetSettingsCommandChatByIndex } from "./lib/settings/settings";

const pref = getPreferenceValues<Preferences>();
if (pref.certificateValidation === false) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(props: LaunchProps<{ arguments: Arguments.QuickAi }>) {
  const [query, setQuery] = React.useState<string | undefined>(props.arguments?.query || props.fallbackText);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();
  const [useChatView] = React.useState(pref.quickAIView === "chat");
  const [modelInfo, setModelInfo] = React.useState<{ server: string; model: string } | undefined>();

  React.useEffect(() => {
    const processQuickAI = async () => {
      try {
        // If no query provided, try to get selected text
        if (!query) {
          try {
            const selectionText = await GetPromptTokenSelectionText();
            setQuery(selectionText);
          } catch {
            setError("No query or selected text provided");
            setLoading(false);
            return;
          }
        }

        if (!query) {
          setError("No query or selected text provided");
          setLoading(false);
          return;
        }

        // Single-result mode uses the primary model from the most recent
        // configured chat, keeping the provider and model together.
        if (!useChatView) {
          const chat = await GetSettingsCommandChatByIndex(0);
          setModelInfo({ server: chat.models.main.server_name, model: chat.models.main.tag });
        }
        setLoading(false);
      } catch (e) {
        const err = e as Error;
        setError(err.message);
        setLoading(false);
      }
    };

    processQuickAI();
  }, []);

  if (error) {
    return <ErrorView error={error} />;
  }

  if (loading) {
    return <LoadingView />;
  }

  if (useChatView && query) {
    // Chat view mode - render ChatView with initial query
    return <ChatView initialQuery={query} />;
  } else {
    // Single view mode - use AnswerView with server and model
    return (
      <AnswerView
        server={modelInfo?.server}
        model={modelInfo?.model}
        prompt="{selection}"
        query={query}
        creativity={Creativity.Low}
        capabilities={[ModelCapability.Completion]}
      />
    );
  }
}

function LoadingView() {
  return <Detail isLoading={true} markdown="Running Quick AI..." />;
}

function ErrorView({ error }: { error: string }) {
  return <Detail markdown={`Error: ${error}`} />;
}
