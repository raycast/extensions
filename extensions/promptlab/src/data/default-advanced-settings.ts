import { Color, Icon } from "@raycast/api";

export const defaultAdvancedSettings = {
  commandDefaults: {
    name: "",
    prompt: "",
    icon: Icon.CommandSymbol,
    iconColor: Color.Red,
    minNumFiles: "0",
    useMetadata: false,
    acceptedFileExtensions: "",
    useAudioDetails: false,
    useSoundClassification: true,
    useSubjectClassification: true,
    useRectangleDetection: false,
    useBarcodeDetection: true,
    useFaceDetection: false,
    outputKind: "detail",
    actionScript: "",
    showResponse: true,
    description: "",
    useSaliencyAnalysis: true,
    author: "",
    website: "",
    version: "1.0.0",
    requirements: "",
    scriptKind: "applescript",
    categories: ["Other"],
    temperature: "1.0",
    favorited: false,
    model: "",
    useSpeech: false,
    speakResponse: false,
    showInMenuBar: true,
  },
  modelDefaults: {
    name: "",
    description: "",
    endpoint: "",
    authType: "apiKey",
    apiKey: "",
    inputSchema: "",
    outputKeyPath: "",
    outputTiming: "async",
    lengthLimit: "2500",
    favorited: false,
    icon: Icon.Cog,
    iconColor: Color.Red,
    notes: "",
    isDefault: false,
    temperature: "1.0",
  },
  chatDefaults: {
    icon: Icon.Message,
    iconColor: Color.Red,
    favorited: false,
    condensingStrategy: "summarize",
    summaryLength: "100",
    showBasePrompt: true,
    useSelectedFilesContext: false,
    useConversationContext: true,
    allowAutonomy: false,
  },
  placeholderSettings: {
    processPlaceholders: true,
    allowCustomPlaceholders: true,
    allowCustomPlaceholderPaths: true,
    useUserShellEnvironment: true,
  },
  actionSettings: {
    RunCommandAction: {
      enabled: ["search-commands"],
    },
    ShareCommandAction: {
      enabled: ["search-commands"],
    },
    OpenPlaceholdersGuideAction: {
      enabled: ["search-commands", "create-command", "chat"],
      openIn: "default",
    },
    OpenAdvancedSettingsAction: {
      enabled: ["search-commands", "create-command", "chat"],
      openIn: "default",
    },
    EditCustomPlaceholdersAction: {
      enabled: ["create-command", "search-commands", "chat"],
      openIn: "default",
    },
    CopyCommandPromptAction: {
      enabled: ["search-commands"],
    },
    CopyCommandJSONAction: {
      enabled: ["search-commands"],
    },
    CopyCommandIDAction: {
      enabled: ["search-commands"],
    },
    ExportAllCommandsAction: {
      enabled: ["search-commands"],
    },
    ToggleFavoriteAction: {
      enabled: ["search-commands"],
    },
    CreateQuickLinkAction: {
      enabled: ["search-commands"],
    },
    EditCommandAction: {
      enabled: ["search-commands"],
    },
    CreateDerivativeAction: {
      enabled: ["search-commands", "discover-commands"],
    },
    DeleteCommandAction: {
      enabled: ["search-commands"],
    },
    DeleteAllCommandsAction: {
      enabled: ["search-commands"],
    },
    InstallAllCommandsAction: {
      enabled: ["discover-commands"],
    },
    InstallCommandAction: {
      enabled: ["discover-commands"],
    },
    ToggleSetupFieldsAction: {
      enabled: ["search-commands", "discover-commands", "create-command"],
    },
    CopyChatResponseAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    CopyChatQueryAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    CopyChatBasePromptAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    ChatSettingsAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    RegenerateChatAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    ToggleChatFavoriteAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    ExportChatAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    DeleteChatAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    DeleteAllChatsAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
    },
    ToggleModelFavoriteAction: {
      enabled: ["manage-models"],
    },
    ToggleModelDefaultAction: {
      enabled: ["manage-models"],
    },
    CreateModelDerivativeAction: {
      enabled: ["manage-models"],
    },
    DeleteModelAction: {
      enabled: ["manage-models"],
    },
    DeleteAllModelsAction: {
      enabled: ["manage-models"],
    },
    CopyModelJSONAction: {
      enabled: ["manage-models"],
    },
    CopyAllModelsJSONAction: {
      enabled: ["manage-models"],
    },
    AddNewModelAction: {
      enabled: ["manage-models"],
    },
    EditModelAction: {
      enabled: ["manage-models"],
    },
  },
};
