import { Icon } from "@raycast/api";
import { boolValue, CommandRequest, Field, FormValues, textValue } from "./cli";

export type Operation = {
  id: string;
  title: string;
  section: string;
  description: string;
  icon: Icon;
  mode: "direct" | "form" | "browser";
  closeOnSuccess?: boolean;
  presentation?:
    | "history"
    | "watches"
    | "replacements"
    | "mode-detail"
    | "mode-current"
    | "models"
    | "rule-packages"
    | "mode-packages";
  fields?: Field[];
  buildRequest: (values: FormValues) => CommandRequest;
  validate?: (values: FormValues) => string | undefined;
};

const blankOption = { title: "None", value: "" };
const llmOptions = [
  { title: "On", value: "on" },
  { title: "Off", value: "off" },
];
const sourceOptions = [
  blankOption,
  { title: "Voice", value: "voice" },
  { title: "Text", value: "text" },
  { title: "Transcribe", value: "transcribe" },
];
const originalCurrentOptions = [
  { title: "Original", value: "original" },
  { title: "Current", value: "current" },
];
export const operations: Operation[] = [
  {
    id: "dictation-start",
    title: "Start Dictation",
    section: "Core",
    description:
      "Run `aimeflux dictation start` with optional mode and LLM cleanup.",
    icon: Icon.Microphone,
    mode: "form",
    closeOnSuccess: true,
    fields: [
      optionalModeDropdown("mode", "Mode"),
      dropdown("llm", "LLM Cleanup", llmOptions, "off"),
    ],
    buildRequest: (values) => {
      const args = ["dictation", "start"];
      pushFlag(args, "--mode", textValue(values, "mode"));
      pushFlag(args, "--llm", textValue(values, "llm"));
      return request("Start Dictation", args, {
        requiresAppRunning: true,
      });
    },
  },
  {
    id: "dictation-stop",
    title: "Stop Dictation",
    section: "Core",
    description: "Run `aimeflux dictation stop`.",
    icon: Icon.Stop,
    mode: "direct",
    closeOnSuccess: true,
    buildRequest: () =>
      request("Stop Dictation", ["dictation", "stop"], {
        requiresAppRunning: true,
      }),
  },
  {
    id: "cleanup-toggle",
    title: "Toggle LLM Cleanup",
    section: "Core",
    description: "Toggle the global AimeFlux LLM cleanup setting.",
    icon: Icon.Switch,
    mode: "direct",
    closeOnSuccess: true,
    buildRequest: () => request("Toggle LLM Cleanup", ["cleanup", "toggle"]),
  },
  {
    id: "process",
    title: "Process Text",
    section: "Core",
    description:
      "Run one-off text processing with modes and replacements, without saving history.",
    icon: Icon.Text,
    mode: "form",
    fields: [
      optionalTextArea("text", "Text", "Paste the text to process"),
      optionalModeDropdown("mode", "Mode"),
      dropdown("llm", "LLM Cleanup", llmOptions, "off"),
    ],
    validate: (values) => {
      const text = textValue(values, "text");
      if (!text) {
        return "Provide text to process.";
      }
      return undefined;
    },
    buildRequest: (values) => {
      const text = textValue(values, "text");
      const args = ["process", text];

      pushFlag(args, "--mode", textValue(values, "mode"));
      pushFlag(args, "--llm", textValue(values, "llm"));

      return request("Process Text", args);
    },
  },
  {
    id: "history",
    title: "Browse History",
    section: "History",
    description:
      "Open the latest history items in a structured browser with filter actions.",
    icon: Icon.Clock,
    mode: "browser",
    presentation: "history",
    buildRequest: () => request("Browse History", ["history", "20"]),
  },
  {
    id: "history-copy-latest",
    title: "Copy Latest History Item",
    section: "History",
    description: "Load the newest history item and copy its text.",
    icon: Icon.Clipboard,
    mode: "direct",
    buildRequest: () => request("Copy Latest History Item", ["history", "1"]),
  },
  {
    id: "history-paste-latest",
    title: "Paste Latest History Item",
    section: "History",
    description:
      "Load the newest history item and paste its text into the frontmost app.",
    icon: Icon.Clipboard,
    mode: "direct",
    buildRequest: () => request("Paste Latest History Item", ["history", "1"]),
  },
  {
    id: "import-text",
    title: "Import Text Into History",
    section: "History",
    description: "Import inline text into transcription history.",
    icon: Icon.Download,
    mode: "form",
    fields: [
      optionalTextArea("text", "Text", "Paste the text to import"),
      optionalModeDropdown("mode", "Mode"),
      dropdown("llm", "LLM Cleanup", llmOptions, "off"),
    ],
    validate: requireText("text", "Provide text to import."),
    buildRequest: (values) => {
      const text = textValue(values, "text");
      const args = ["import-text", text];

      pushFlag(args, "--mode", textValue(values, "mode"));
      pushFlag(args, "--llm", textValue(values, "llm"));

      return {
        label: "Import Text Into History",
        args,
      };
    },
  },
  {
    id: "mode-current",
    title: "Show Current Mode",
    section: "Modes & Models",
    description: "Show the active manual mode and switch to another one.",
    icon: Icon.Compass,
    mode: "browser",
    presentation: "mode-current",
    buildRequest: () => ({
      label: "Show Current Mode",
      args: ["mode", "current"],
    }),
  },
  {
    id: "mode-set",
    title: "Set Current Mode",
    section: "Modes & Models",
    description: "Change the active manual mode by name or id.",
    icon: Icon.ArrowRight,
    mode: "form",
    closeOnSuccess: true,
    fields: [requiredModeDropdown("modeId", "Mode")],
    validate: requireText("modeId", "Mode name or id is required."),
    buildRequest: (values) => ({
      label: "Set Current Mode",
      args: ["mode", "set", textValue(values, "modeId")],
    }),
  },
  {
    id: "mode-show",
    title: "Show Mode",
    section: "Modes & Models",
    description: "Inspect one current mode by name or id.",
    icon: Icon.Eye,
    mode: "form",
    presentation: "mode-detail",
    fields: [requiredModeDropdown("modeId", "Mode")],
    validate: requireText("modeId", "Mode name or id is required."),
    buildRequest: (values) => ({
      label: "Show Mode",
      args: ["mode", "show", textValue(values, "modeId")],
    }),
  },
  {
    id: "model-list",
    title: "List Installed Models",
    section: "Modes & Models",
    description:
      "Browse installed Whisper models and remove models that are not in active use.",
    icon: Icon.List,
    mode: "browser",
    presentation: "models",
    buildRequest: () => ({
      label: "List Installed Models",
      args: ["model", "list"],
    }),
  },
  {
    id: "replacement-list",
    title: "List Replacements",
    section: "Replacements",
    description: "List deterministic replacements globally or for one mode.",
    icon: Icon.List,
    mode: "browser",
    presentation: "replacements",
    buildRequest: () => ({
      label: "List Replacements",
      args: ["replacement", "list"],
    }),
  },
  {
    id: "replacement-add",
    title: "Add Replacement",
    section: "Replacements",
    description: "Add a deterministic replacement globally or for a mode.",
    icon: Icon.Plus,
    mode: "form",
    fields: [
      checkbox("globalTarget", "Target Global Replacements"),
      optionalModeDropdown("mode", "Mode"),
      requiredText("from", "From", "teh"),
      requiredText("to", "To", "the"),
    ],
    validate: (values) => {
      if (!textValue(values, "from")) {
        return "Replacement source text is required.";
      }
      if (!textValue(values, "to")) {
        return "Replacement target text is required.";
      }
      return undefined;
    },
    buildRequest: (values) => {
      const args = ["replacement", "add"];
      pushBoolean(args, "--global", boolValue(values, "globalTarget"));
      pushFlag(args, "--mode", textValue(values, "mode"));
      args.push(
        "--from",
        textValue(values, "from"),
        "--to",
        textValue(values, "to"),
      );
      return {
        label: "Add Replacement",
        args,
      };
    },
  },
  {
    id: "rule-package-list",
    title: "List Rule Packages",
    section: "Community Packages",
    description: "Browse installed rule packages and enable or disable them.",
    icon: Icon.List,
    mode: "browser",
    presentation: "rule-packages",
    buildRequest: () => ({
      label: "List Rule Packages",
      args: ["rule-package", "list"],
    }),
  },
  {
    id: "mode-package-list",
    title: "List Mode Packages",
    section: "Community Packages",
    description: "Browse installed mode packages and enable or disable them.",
    icon: Icon.List,
    mode: "browser",
    presentation: "mode-packages",
    buildRequest: () => ({
      label: "List Mode Packages",
      args: ["mode-package", "list"],
    }),
  },
  {
    id: "watch-list",
    title: "List Watch Folders",
    section: "Watch",
    description: "List configured watch folders.",
    icon: Icon.List,
    mode: "browser",
    presentation: "watches",
    buildRequest: () => ({
      label: "List Watch Folders",
      args: ["watch", "list"],
    }),
  },
];

function request(
  label: string,
  args: string[],
  overrides?: Partial<CommandRequest>,
): CommandRequest {
  return {
    label,
    args,
    detached: overrides?.detached,
    stdin: overrides?.stdin,
    requiresAppRunning: overrides?.requiresAppRunning,
  };
}

function pushFlag(args: string[], flag: string, value: string) {
  if (value) {
    args.push(flag, value);
  }
}

function pushBoolean(args: string[], flag: string, enabled: boolean) {
  if (enabled) {
    args.push(flag);
  }
}

function requiredText(id: string, label: string, placeholder: string): Field {
  return {
    id,
    label,
    type: "text",
    placeholder,
    required: true,
  };
}

function optionalTextArea(
  id: string,
  label: string,
  placeholder: string,
): Field {
  return {
    id,
    label,
    type: "textarea",
    placeholder,
  };
}

function checkbox(id: string, label: string): Field {
  return {
    id,
    label,
    type: "checkbox",
    defaultValue: false,
  };
}

function dropdown(
  id: string,
  label: string,
  options: { title: string; value: string }[],
  defaultValue?: string,
): Field {
  return {
    id,
    label,
    type: "dropdown",
    options,
    defaultValue,
  };
}

function optionalModeDropdown(id: string, label: string): Field {
  return {
    id,
    label,
    type: "dropdown",
    optionsSource: "modes",
    includeEmptyOption: true,
    defaultValue: "",
  };
}

function requiredModeDropdown(id: string, label: string): Field {
  return {
    id,
    label,
    type: "dropdown",
    optionsSource: "modes",
  };
}

function requireText(key: string, message: string) {
  return (values: FormValues) => (textValue(values, key) ? undefined : message);
}
