import { Detail, getPreferenceValues, LaunchProps } from "@raycast/api";
import * as React from "react";
import { AnswerView } from "./lib/ui/AnswerView/main";
import { ChatView } from "./lib/ui/ChatView/main";
import { GetPromptTokenSelectionText } from "./lib/ui/AnswerView/function";
import { Creativity, ModelCapability } from "./lib/enum";
import { formatCustomServerName, isCustomServer } from "./lib/providers/unified-provider";
import { loadCustomProviders } from "./lib/providers/storage";

const pref = getPreferenceValues<Preferences>();
if (!pref.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(props: LaunchProps<{ arguments: Arguments.QuickAi }>) {
  const [query, setQuery] = React.useState<string | undefined>(props.arguments?.query || props.fallbackText);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | undefined>();
  const [useChatView] = React.useState(pref.ollamaQuickAIView === "chat");
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

        // Use Quick AI model or fall back to default model from preferences
        const quickAIModel = pref.ollamaQuickAIModel || pref.ollamaDefaultModel;
        if (!quickAIModel) {
          setError("Please configure a Quick AI model or default model in preferences");
          setLoading(false);
          return;
        }

        // Set model info for both modes
        let server = "Local";
        let model = quickAIModel;
        if (quickAIModel.includes(":")) {
          const colonIndex = quickAIModel.indexOf(":");
          const potentialServer = quickAIModel.substring(0, colonIndex);
          const potentialModel = quickAIModel.substring(colonIndex + 1);
          if (isCustomServer(potentialServer) || isCustomServer(potentialServer.trim())) {
            server = potentialServer;
            model = potentialModel;
          }
        }
        if (server === "Local") {
          const customProviders = await loadCustomProviders();
          for (const cp of customProviders) {
            if (cp.models.some((m) => m.id === model || m.name === model)) {
              server = formatCustomServerName(cp);
              break;
            }
          }
        }
        setModelInfo({ server, model });
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

  if (useChatView && modelInfo && query) {
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
