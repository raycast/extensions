import { getPreferenceValues } from "@raycast/api";
import CommandChatView from "./components/Chats/CommandChatView";

interface CommandPreferences {
  basePrompt: string;
  useSelectedFiles: boolean;
  useConversationHistory: boolean;
  autonomousFeatures: boolean;
}

export default function Command(props: { arguments: { initialQuery: string } }) {
  const { initialQuery } = props.arguments;

  const preferences = getPreferenceValues<CommandPreferences>();

  const options = {
    minNumFiles: 1,
    acceptedFileExtensions: undefined,
    useMetadata: true,
    useAudioDetails: true,
    useSubjectClassification: true,
    useRectangleDetection: true,
    useBarcodeDetection: true,
    useFaceDetection: true,
    useSaliencyAnalysis: true,
  };

  return (
    <CommandChatView
      isLoading={false}
      commandName="PromptLab Chat"
      options={options}
      prompt={preferences.basePrompt}
      initialQuery={initialQuery}
      response={"Ready for your query."}
      revalidate={() => null}
      cancel={null}
      useFiles={preferences.useSelectedFiles}
      useConversation={preferences.useConversationHistory}
      autonomousFeatures={preferences.autonomousFeatures}
    />
  );
}
