import { Color, Icon } from "@raycast/api";

export const defaultAdvancedSettings = {
  settingsVersion: 1.1,
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
      shortcut: {
        key: "r",
        modifiers: ["cmd"],
      },
    },
    ShareCommandAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "s",
        modifiers: ["cmd", "shift"],
      },
    },
    OpenPlaceholdersGuideAction: {
      enabled: ["search-commands", "create-command", "chat"],
      openIn: "default",
      shortcut: {
        key: "g",
        modifiers: ["cmd", "shift"],
      },
    },
    OpenAdvancedSettingsAction: {
      enabled: ["search-commands", "create-command", "chat"],
      openIn: "default",
      shortcut: {
        key: "v",
        modifiers: ["cmd", "shift"],
      },
    },
    EditCustomPlaceholdersAction: {
      enabled: ["create-command", "search-commands", "chat"],
      openIn: "default",
      shortcut: {
        key: "p",
        modifiers: ["cmd", "shift"],
      },
    },
    CopyCommandPromptAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "p",
        modifiers: ["cmd", "shift"],
      },
    },
    CopyCommandJSONAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "j",
        modifiers: ["cmd", "shift"],
      },
    },
    CopyCommandIDAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "i",
        modifiers: ["cmd", "shift"],
      },
    },
    ExportAllCommandsAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "a",
        modifiers: ["cmd", "shift"],
      },
    },
    ToggleFavoriteAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "f",
        modifiers: ["cmd", "shift"],
      },
    },
    CreateQuickLinkAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "q",
        modifiers: ["cmd", "shift"],
      },
    },
    EditCommandAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "e",
        modifiers: ["cmd"],
      },
    },
    CreateDerivativeAction: {
      enabled: ["search-commands", "discover-commands"],
      shortcut: {
        key: "d",
        modifiers: ["cmd"],
      },
    },
    DeleteCommandAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "d",
        modifiers: ["cmd"],
      },
    },
    DeleteAllCommandsAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "d",
        modifiers: ["cmd", "opt", "shift"],
      },
    },
    InstallAllCommandsAction: {
      enabled: ["discover-commands"],
      shortcut: {
        key: "i",
        modifiers: ["cmd", "shift"],
      },
    },
    InstallCommandAction: {
      enabled: ["discover-commands"],
      shortcut: {
        key: "i",
        modifiers: ["cmd"],
      },
    },
    ToggleSetupFieldsAction: {
      enabled: ["search-commands", "discover-commands", "create-command"],
      shortcut: {
        key: "s",
        modifiers: ["cmd", "shift"],
      },
    },
    CopyChatResponseAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "c",
        modifiers: ["cmd", "shift"],
      },
    },
    CopyChatQueryAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "q",
        modifiers: ["cmd", "shift"],
      },
    },
    CopyChatBasePromptAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "p",
        modifiers: ["cmd", "shift"],
      },
    },
    ChatSettingsAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "e",
        modifiers: ["cmd"],
      },
    },
    RegenerateChatAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "r",
        modifiers: ["cmd"],
      },
    },
    ToggleChatFavoriteAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "f",
        modifiers: ["cmd"],
      },
    },
    ExportChatAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "e",
        modifiers: ["cmd", "shift"],
      },
    },
    DeleteChatAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "d",
        modifiers: ["cmd"],
      },
    },
    DeleteAllChatsAction: {
      enabled: ["search-commands", "discover-commands", "chat"],
      shortcut: {
        key: "d",
        modifiers: ["cmd", "opt", "shift"],
      },
    },
    ToggleModelFavoriteAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "f",
        modifiers: ["cmd"],
      },
    },
    ToggleModelDefaultAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "d",
        modifiers: ["cmd", "shift"],
      },
    },
    CreateModelDerivativeAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "c",
        modifiers: ["cmd", "shift"],
      },
    },
    DeleteModelAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "d",
        modifiers: ["cmd"],
      },
    },
    DeleteAllModelsAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "d",
        modifiers: ["cmd", "opt", "shift"],
      },
    },
    CopyModelJSONAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "j",
        modifiers: ["cmd", "shift"],
      },
    },
    CopyAllModelsJSONAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "j",
        modifiers: ["cmd", "opt", "shift"],
      },
    },
    AddNewModelAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "n",
        modifiers: ["cmd"],
      },
    },
    EditModelAction: {
      enabled: ["manage-models"],
      shortcut: {
        key: "e",
        modifiers: ["cmd"],
      },
    },
  },
};
