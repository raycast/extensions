import { Color, Icon } from "@raycast/api";

/**
 * The default advanced settings for the extension.
 */
export const defaultAdvancedSettings = {
  /**
   * The version of the settings. This is used to determine if the settings need to be migrated.
   */
  settingsVersion: 1.13,

  /**
   * Default values for newly created commands.
   */
  commandDefaults: {
    name: "",
    prompt: "",
    icon: Icon.CommandSymbol,
    iconColor: Color.Red,
    minNumFiles: "0",
    useMetadata: false,
    acceptedFileExtensions: "",
    useAudioDetails: false,
    useSoundClassification: false,
    useSubjectClassification: false,
    useRectangleDetection: false,
    useBarcodeDetection: false,
    useFaceDetection: false,
    outputKind: "detail",
    actionScript: "",
    showResponse: true,
    description: "",
    useSaliencyAnalysis: false,
    useHorizonDetection: false,
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
    recordRuns: true,
  },

  /**
   * Default settings for newly added models.
   */
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

  /**
   * Default settings for newly created chats.
   */
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

  /**
   * Settings for the Placeholders System and for specific placeholders.
   */
  placeholderSettings: {
    /**
     * Whether to process placeholders at all.
     */
    processPlaceholders: true,

    /**
     * Whether to allow custom placeholders.
     */
    allowCustomPlaceholders: true,

    /**
     * Whether to allow custom placeholders sourced from custom paths.
     */
    allowCustomPlaceholderPaths: true,

    /**
     * Whether to use the user's shell environment when processing `{{shell:...}}` placeholders.
     */
    useUserShellEnvironment: true,
  },

  /**
   * Settings for analyzing selected files.
   */
  fileAnalysisSettings: {
    /**
     * The number of sample frames to use when analyzing video files.
     */
    videoSampleCount: 15,

    /**
     * Whether to use the preview image when analyzing Keynote files vs. analyzing the image of each slide.
     */
    singlePreviewForKeynote: false,
  },

  /**
   * Settings for actions throughout the extension.
   */
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
    CopyJSONAction: {
      enabled: ["search-commands", "manage-models", "chat"],
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
      enabled: ["search-commands", "manage-models", "chat"],
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
    DeleteAction: {
      enabled: ["search-commands", "discover-commands", "chat", "manage-models"],
      shortcut: {
        key: "x",
        modifiers: ["cmd"],
      },
    },
    DeleteAllAction: {
      enabled: ["search-commands", "discover-commands", "chat", "manage-models"],
      shortcut: {
        key: "x",
        modifiers: ["cmd", "opt", "shift"],
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
    CopyAllJSONAction: {
      enabled: ["manage-models", "chat"],
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
    ViewPreviousRunsAction: {
      enabled: ["search-commands"],
      shortcut: {
        key: "p",
        modifiers: ["cmd", "opt"],
      },
    },
  },
};

/**
 * Interface for the advanced settings of the extension.
 */
export type AdvancedSettings = typeof defaultAdvancedSettings;
