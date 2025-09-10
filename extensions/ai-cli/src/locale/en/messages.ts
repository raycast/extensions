export const messages = {
  ui: {
    textInput: {
      title: "Text",
      placeholderWithClipboard: "Text loaded from clipboard. You can edit it here...",
      placeholderEmpty: "Paste or type your text here...",
      hint: "Enter the text you want to format and transform using AI agent",
    },
    additionalContext: {
      title: "Additional Context",
      placeholder: "Optional: Add context, requirements, etc.",
      hint: "Provide additional context, requirements, or instructions to guide the formatting",
    },
    form: {
      templateTitle: "Template",
      templateHint: "Choose the template for your prompt",
      toneTitle: "Tone",
      toneHint: "Select the writing tone and style",
      modelTitle: "AI Model",
      modelHint: "Select the AI model to use",
      targetFolderTitle: "Target Folder",
      targetFolderHint: "Directory where AI agent commands will execute",
      targetFolderPlaceholder: "Use default working directory...",
    },
    templates: {
      slack: "Slack",
      "code-review": "Code Review",
      email: "Email",
      "bug-report": "Bug Report",
      "technical-docs": "Technical Documentation",
      custom: "None",
    },
    tones: {
      default: "Default",
      professional: "Professional",
      conversational: "Conversational",
      technical: "Technical",
      educational: "Educational",
      concise: "Concise",
    },
    descriptions: {
      processing: "Processing your prompt with AI agent...",
      default: "Use AI agent with DevPromptAI",
      formatSettings: "Template Settings",
      generationOptions: "Generation Options",
    },
    templateDescriptions: {
      slack: {
        name: "Slack",
        description: "Casual, engaging team communication with emoji support",
      },
      "code-review": {
        name: "Code Review",
        description: "Technical feedback for pull requests and code reviews across platforms",
      },
      email: {
        name: "Email",
        description: "Professional business communication with proper structure",
      },
      "bug-report": {
        name: "Bug Report",
        description: "Structured problem descriptions for issue tracking systems",
      },
      "technical-docs": {
        name: "Technical Documentation",
        description: "Professional technical documentation with clear structure",
      },
      custom: {
        name: "None",
        description: "Use your own instructions without a predefined template",
      },
    },
  },

  emptyState: {
    title: "No results yet",
  },

  actions: {
    formatText: "Ask AI",
    processing: "Processing...",
    refreshClipboard: "Refresh Clipboard",
    copyVariant: "Copy Variant",
    copyActions: "Copy Actions",
    copyContent: "Copy",
    quickCopy: "Quick Copy",
    copyVariantNumber: "Copy Variant {number}",
    copyAnswer: "Copy Answer",
    generateAdditionalVariant: "Generate Another Variant",
    generating: "Generating…",
    askFollowUpQuestion: "Ask Follow-Up Question",
    generateActions: "Generate",
    additionalActions: "Additional Actions",
    managementActions: "Management",
    manageTemplates: "Manage Templates",
    manageTones: "Manage Tones",
    showFullPrompt: "Show Full Prompt",
    copyFullPrompt: "Copy Full Prompt",
  },

  toast: {
    clipboardRefreshed: "Clipboard Refreshed",
    clipboardAccessFailed: "Clipboard Access Failed",
    failedToReadClipboard: "Failed to Read Clipboard",
    processingFailed: "Processing Failed",
    agentProcessingFailed: "AI Agent Processing Failed",
    responseProcessingFailed: "Response Processing Failed",
    copiedToClipboard: "Copied to Clipboard",
    copyFailed: "Copy Failed",
    failedToCopy: "Failed to copy to clipboard",
    variantCopied: "Copied!",
    variantCopiedDetail: "Text copied to clipboard",
    additionalVariantFailed: "Failed to Process Follow-Up",
    additionalVariantFailedDetail: "Unable to process follow-up question",
    toneCreated: "Tone Created",
    toneUpdated: "Tone Updated",
    toneCreateFailed: "Failed to Create Tone",
    toneUpdateFailed: "Failed to Update Tone",
    templateCreated: "Template Created",
    templateUpdated: "Template Updated",
    templateCreateFailed: "Failed to Create Template",
    templateUpdateFailed: "Failed to Update Template",
    processingWithAgent: "Processing...",
    processingNewVariant: "Processing Follow-Up...",
    processingComplete: "Processing Complete",
    generatingSingleVariant: "Please wait...",
  },

  validation: {
    emptyText: "Please enter text",
    emptyCustomPrompt: "Please enter a system prompt",
    invalidInput: "Invalid Input",
    invalidSelection: "Please select a valid option",
    configurationError: "Configuration Error",
    directoryError: "Directory Error",
    emptyClipboard: "Clipboard is empty or contains no text",
    textTooLong: "Text is too long ({length} characters). Maximum allowed: {maxLength}",
    agentPathNotFound: "AI agent CLI path not found: {path}. Please check the path in preferences.",
    pathNotFile: "Path is not a file: {path}. Please check the path in preferences.",
    cannotAccessClaude: "Cannot access Claude Code at {path}: {error}. Please check the path in preferences.",
    shellPathNotFound: "Shell executable not found at path: {path}. Please check the path in preferences.",
    shellNotExecutable: "Shell at {path} is not executable. Please check file permissions.",
    cannotAccessShell: "Cannot access shell at {path}: {error}",
    notExecutable: "AI agent at {path} is not executable. Please check file permissions.",
    cannotAccessAgent: "Cannot access AI agent at {path}: {error}. Please check the path in preferences.",
    directoryNotExists: "Directory does not exist: {path}",
    pathNotDirectory: "Path is not a directory: {path}",
    cannotAccessDirectory: "Cannot access directory: {path}. {error}",
    targetFolderNotExists: "Target folder does not exist: {path}",
    targetFolderNotAccessible: "Cannot access target folder: {path}",
    targetFolderInvalid: "Please enter a valid directory path",
    invalidUrl: "Please enter a valid HTTP or HTTPS URL. Other protocols are not allowed for security reasons.",
    imageLoadFailed: "Could not load image from the provided URL",
    imagePreviewLoading: "Loading preview...",
    imagePreviewUnavailable: "Preview unavailable",
    tonePlaceholders: "Tone section should include {tone_guidelines} or {tone_name} placeholders",
    instructionsRequired: "Core instructions are required for the template",
    nameRequired: "Template name is required",
    systemConfigurationError: "System configuration error",
    templateRequired: "Please select a valid template",
    toneRequired: "Please select a valid tone",
    modelRequired: "Please select a valid model",
    templateForm: {
      instructionsRequired: "Instructions are required for the template",
      tonePlaceholdersRequired: "Tone section must include {tone_guidelines} or {tone_name} placeholders",
      templateConversionFailed: "Template conversion failed: missing instructions",
      processingFailed: "Failed to process template",
    },
  },

  templateForm: {
    invalidTemplateSelection: "Please select a valid template before submitting.",
    invalidToneSelection: "Please select a valid tone before submitting.",
    selectValidOptions: "Please select a valid template and tone before submitting.",
    unknownTemplate: "Unknown template",
  },

  errors: {
    agentTimeout: "The Agent CLI request timed out. Please try again.",
    agentNotFound: "Agent CLI executable not found. Please check the path in preferences.",
    permissionDenied: "Permission denied. Check AI agent permissions or authentication setup.",
    authFailed: "Authentication failed. Please check your AI agent credentials.",
    malformedResponse: "Failed to process AI agent response. The output may be malformed.",
    agentCliConfig: "Agent CLI timed out or failed. Check if the AI agent is authenticated and configured properly.",
    unableToReadClipboard: "Unable to read clipboard content",
    timeoutError: "Timeout Error",
    permissionError: "Permission Error",
    authenticationError: "Authentication Error",
    networkError: "Network Error",
    configurationError: "Configuration Error",
    processingError: "Processing Error",
    navigationFailed: "Failed to open {command}",
    navigationError: "Could not launch the {command} command",

    timeoutRecovery:
      "Operation timed out. Try reducing input length, increasing timeout in preferences, or checking your connection.",

    notFoundRecovery: "AI agent CLI executable not found. Please check the path in preferences.",
    permissionRecovery:
      "Permission denied accessing AI agent. Check file permissions or try running from a different directory.",
    authRecovery:
      "Authentication failed. Please check your AI agent credentials in preferences or set up authentication.",
    parsingRecovery: "Failed to process AI agent's response. This may be temporary - try the request again.",
    networkRecovery: "Network connection failed. Check your internet connection and try again.",
    configRecovery: "Configuration error detected. Please check your AI agent settings in preferences.",
    unknownRecovery: "An unexpected error occurred. Try the request again or contact support if the issue persists.",
  },

  errorDisplay: {
    errorType: "Error Type:",
    message: "Message:",
    suggestions: "Suggestions:",
  },

  processing: {
    agentNotConfigured: "AI Agent May Not Be Configured",
    configWarning: "If you get timeout errors, check authentication in preferences first",
    pathNotConfigured: "AI agent path is not configured. Please check preferences.",
    authNotConfigured: "AI agent authentication not configured in Raycast environment",
    authWarning:
      "AI agent found but authentication status unknown. If you get timeout errors, check credentials in preferences first.",
  },

  suggestions: {
    setupAuthentication: "Set up authentication for your AI agent in preferences",
    environmentVariables: "Environment variables are not inherited by Raycast - configure in preferences instead",
    restartRaycast: "Or restart Raycast after setting environment variables globally",
  },

  results: {
    formattedForSingle: "Formatted for {formatName}",
    variantHeader: "Result {index}",
    editingInstructions: "Edit text as needed • Press Cmd+1, Cmd+2, etc. to copy each variant • Or use Action Panel",
    editingInstructionsSingle: "Edit text as needed • Use Actions to copy",
    variantSection: "## Variant {index}",
    formattedText: "Formatted Text",
    variantNumber: "Variant {number}",
  },

  followUp: {
    searchPlaceholder: "Ask a follow-up question and press Enter...",
    askPrompt: 'Ask: "{question}"',
    askSubtitle: "Press Enter to ask this follow-up question",
    processedTitle: "Follow-up processed",
    processedMessage: "New response added to the list",
    failedTitle: "Follow-up failed",
  },

  promptDetail: {
    title: "Full Prompt",
    subtitle: "Complete prompt being sent to AI agent",
    description: "This is the exact prompt that will be sent to the AI agent for processing.",
    metadataTitle: "Prompt Configuration",
    template: "Template: {template}",
    tone: "Tone: {tone}",
    variants: "Variants: {count}",
    context: "Additional Context: {context}",
    inputLength: "Input Length: {length} characters",
    noContext: "None",
    promptTitle: "Generated Prompt",
    targetFolderLabel: "Target Folder",
    modelLabel: "Model",
    templateLabel: "Template",
    toneLabel: "Tone",
    defaultWorkingDirectory: "Default working directory",
    unknownModel: "Unknown Model",
  },

  toneDescriptions: {
    default: {
      name: "Default",
      description: "Natural AI response without tone modification",
      guidelines: "",
    },
    professional: {
      name: "Professional",
      description: "Formal, polished communication for business contexts",
      guidelines: `Always preserve code blocks, file paths, URLs, technical identifiers, versions, config indentation, error messages, diffs, and Markdown structure exactly as they appear. Never fabricate technical content.

Use formal, polished language:
- No contractions (use "do not" instead of "don't")
- Maintain respectful and courteous tone
- Use precise terminology without casual explanations
- Present information objectively and authoritatively
- Use complete sentences and proper grammar
- Avoid colloquialisms, slang, or informal expressions
- Address the user respectfully (avoid "hey", "just", "simply")`,
    },
    conversational: {
      name: "Conversational",
      description: "Friendly, collaborative tone like pair programming with a colleague",
      guidelines: `Always preserve code blocks, file paths, URLs, technical identifiers, versions, config indentation, error messages, diffs, and Markdown structure exactly as they appear. Never fabricate technical content.

Use a friendly, collaborative communication style:
- Use contractions naturally (it's, you'll, we're, let's)
- Include collaborative language ("we", "our", "let's try")
- Add casual transitions like "So," "Now," "Here's what I'm thinking"
- Use active voice and direct communication
- Address the user as a colleague or teammate
- Express uncertainty naturally with phrases like "I think" or "it seems like"
- Use encouraging language ("great question", "nice approach")`,
    },
    technical: {
      name: "Technical",
      description: "Precise, expert-level communication assuming domain knowledge",
      guidelines: `Always preserve code blocks, file paths, URLs, technical identifiers, versions, config indentation, error messages, diffs, and Markdown structure exactly as they appear. Never fabricate technical content.

Use precise, expert-level communication:
- Use exact technical terminology without defining basic concepts
- Assume the reader understands the technical context
- Focus on accuracy, specificity, and technical correctness
- Avoid hedging language ("might", "could", "perhaps")
- State facts directly and confidently
- Reference specific technologies, patterns, and standards by name
- Use imperative mood for instructions ("Configure", "Update", "Run")`,
    },
    educational: {
      name: "Educational",
      description: "Clear explanations with context and examples for learning",
      guidelines: `Always preserve code blocks, file paths, URLs, technical identifiers, versions, config indentation, error messages, diffs, and Markdown structure exactly as they appear. Never fabricate technical content.

Focus on teaching and explanation:
- Explain the "why" behind concepts, not just the "what"
- Include brief context for technical terms when helpful
- Break down complex topics into digestible explanations
- Connect new concepts to familiar ones when possible
- Use analogies sparingly when they aid understanding
- Add learning-focused transitions ("Here's why this matters", "The key concept here")
- Encourage understanding rather than just providing answers`,
    },
    concise: {
      name: "Concise",
      description: "Brief, direct responses with maximum impact and minimum words",
      guidelines: `Always preserve code blocks, file paths, URLs, technical identifiers, versions, config indentation, error messages, diffs, and Markdown structure exactly as they appear. Never fabricate technical content.

Use brief, direct language:
- Remove unnecessary words and filler phrases
- Get straight to the point without preamble or apologies
- Limit explanations to essential information only
- Use imperative mood ("Do X", "Run Y", "Check Z")
- Avoid repetition and redundant information
- Ban filler words and phrases ("just", "simply", "basically")
- Focus on actionable information only`,
    },
  },

  textProcessing: {
    truncatedSuffix: "\n\n[Text truncated due to length...]",
  },

  confirmations: {
    deleteAction: "This action cannot be undone.",
    deleteButton: "Delete",
    cancelButton: "Cancel",
    deletedTitle: "Deleted",
    deletedMessage: "{title} completed successfully",
    failedTitle: "Failed",
    failedMessage: "An error occurred",
    dangerZone: "Danger Zone",
  },

  search: {
    templatesPlaceholder: "Search templates...",
    tonesPlaceholder: "Search tones...",
  },

  management: {
    customTemplates: "Templates",
    customTones: "Tones",
    createNewTemplate: "Create New Template",
    createNewTone: "Create New Tone",
    editTemplate: "Edit Template",
    editTone: "Edit Tone",
    deleteTemplate: "Delete Template",
    deleteTone: "Delete Tone",
    copyPromptTemplate: "Copy Prompt Template",
    copyGuidelines: "Copy Guidelines",
    entityActions: {
      copyTemplate: "Copy Prompt Template",
      copyTone: "Copy Guidelines",
      editTemplate: "Edit Template",
      editTone: "Edit Tone",
      deleteTemplate: "Delete Template",
      deleteTone: "Delete Tone",
      createTemplate: "Create New Template",
      createTone: "Create New Tone",
    },
    noTemplatesFound: "No templates found",
    noTonesFound: "No tones found",
    createFirstTemplate: "Create your first custom template to get started",
    createFirstTone: "Create your first custom tone to get started",
    templatesCount: "Templates ({count})",
    tonesCount: "Tones ({count})",
    totalCount: "{count} total",
    noTemplate: "No Templates",
    noGuidelines: "No Guidelines",
    navigationTitle: {
      customTemplates: "Templates",
      customTones: "Tones",
    },
  },

  forms: {
    placeholders: {
      templateName: "e.g., Email, Documentation, Blog Post",
      toneName: "e.g., Friendly, Formal, Technical",
      instructions:
        "You are helping format text for [purpose]. Create [style] versions that are appropriate for [context]...",
      tone: 'Apply the following tone and style guidelines: {tone_guidelines}\nAdapt the formality level to match "{tone_name}"...',
      requirements:
        "- Use appropriate formatting\n- Maintain clarity and readability\n- Follow best practices for the target format...",
      outputInstructions:
        "Format each variant as a complete [format] ready to use.\nUse proper formatting conventions...",
      // variantSeparator is now hardcoded as "---"
      toneGuidelines: "Detailed guidelines for this tone...",
      pictureUrl: "https://example.com/icon.png (optional)",
    },
    descriptions: {
      createTemplate: "Create a new custom template",
      editTemplate: "Edit the template configuration",
      createTone: "Create a new custom tone",
      editTone: "Edit the tone configuration",
      instructionsHelp:
        "Core instructions tell the AI agent what kind of formatting to apply. This is the main directive that defines the purpose and approach for text processing.",
      toneHelp:
        "Optional tone section that will be replaced with actual tone guidelines. Use {tone_guidelines} for tone details and {tone_name} for the tone name.",
      requirementsHelp:
        "Specific requirements and formatting rules that the AI agent should follow when processing the text.",
      outputInstructionsHelp: "Instructions for how the final output should be formatted and structured.",
      // variantSeparatorHelp: Removed - separator is now hardcoded
      templateSectionsHelp:
        "Template sections allow you to create structured, reusable templates. Instructions are required, while other sections are optional and will be included only when relevant placeholders are used.",
      pictureUrlHelp:
        "Add a custom icon for this template by providing an image URL. Supported templates: PNG, JPG, GIF, SVG, WebP. Leave empty to use the default icon.",
      guidelinesHelp:
        "Guidelines define the writing style and tone characteristics that the AI agent will follow when processing your text.",
    },
    titles: {
      name: "Name",
      instructions: "Core Instructions",
      tone: "Tone Guidelines Section",
      requirements: "Requirements",
      outputInstructions: "Output Format Instructions",
      // variantSeparator: Removed - now hardcoded
      guidelines: "Guidelines",
      pictureUrl: "Custom Icon URL",
    },
    navigationTitles: {
      createTemplate: "Create New Template",
      editTemplate: 'Edit "{name}"',
      createTone: "Create New Tone",
      editTone: 'Edit "{name}"',
    },
    buttons: {
      createTemplate: "Create Template",
      updateTemplate: "Update Template",
      createTone: "Create Tone",
      updateTone: "Update Tone",
      deleteTemplate: "Delete Template",
      deleteTone: "Delete Tone",
      cancel: "Cancel",
    },
  },

  generic: {
    requiredField: "This field is required",
    unexpectedError: "An unexpected error occurred",
    unknownError: "Unknown error",
    invalidSelection: "Invalid Selection",
    selectValidOptions: "Please select a valid template and tone before submitting.",
  },

  templates: {
    placeholders: {
      toneGuidelines: "{tone_guidelines}",
      toneName: "{tone_name}",
      context: "{context}",
      text: "{text}",
    },
    sections: {
      instructions: "Core Instructions",
      tone: "Tone Guidelines",
      requirements: "Requirements",
      outputFormat: "Output Format",
    },
    help: {
      placeholderUsage: "Use placeholders like {tone_guidelines}, {context}, and {text} to create dynamic templates",
      sectionOptional: "All sections except instructions are optional and will only be included when relevant",
      // variantSeparator: Removed - now hardcoded as "---"
    },
  },

  errorRecovery: {
    timeout: ["Check your internet connection", "Reduce the input text length"],
    notFound: [
      "Check the AI agent path in preferences",
      "Ensure the AI agent is properly installed",
      "Verify the executable permissions",
    ],
    permission: [
      "Check file permissions for AI agent executable",
      "Ensure the working directory is accessible",
      "Try running from a different directory",
    ],
    authentication: ["Check your AI agent authentication", "Verify your API key or token", "Try logging in again"],
    parsing: ["Try the request again", "Check if the input format is valid"],
    network: [
      "Check internet connection",
      "Verify network settings",
      "Try again in a few moments",
      "Check for service outages",
    ],
    configuration: [
      "Check AI agent settings in preferences",
      "Verify all required configuration values",
      "Reset to default settings if needed",
      "Contact support for configuration help",
    ],
    unknown: ["Try the request again", "Check the AI agent configuration", "Contact support if the issue persists"],
  },

  promptBuilder: {
    validation: {
      templateIdEmpty: "Template ID cannot be empty",
      templateNameEmpty: "Template name cannot be empty",
      templateMustHaveInstructions: "Template must have instructions section",
      textParameterEmpty: "Text parameter cannot be empty",
      invalidTemplate: "Invalid template: {id}",
    },
    sections: {
      instructions: "## Instructions",
      toneAndStyle: "## Tone & Style",
      additionalContext: "## Additional Context",
      requirements: "## Requirements",
      textToProcess: "## Text",
      outputFormat: "## Output Format",
    },
    // variants block removed in single-variant system
  },
};
