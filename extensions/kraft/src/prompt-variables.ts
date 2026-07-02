export const promptVariables = [
  {
    name: "{{input}}",
    description: "Text from selection, clipboard, OCR, or manual typing.",
  },
  {
    name: "{{source}}",
    description: "Input source, such as manual, selected, clipboard, or ocr.",
  },
  {
    name: "{{sourceLang}}",
    description: "Detected or selected source language.",
  },
  {
    name: "{{targetLang}}",
    description: "Current output language.",
  },
  {
    name: "{{toolName}}",
    description: "Name of the tool being executed.",
  },
  {
    name: "{{isoTime}}",
    description: "Current time in ISO format.",
  },
  {
    name: "{{localeTime}}",
    description: "Current local time using the system locale.",
  },
  {
    name: "{{timezone}}",
    description: "Current system time zone.",
  },
  {
    name: "{{conversation}}",
    description: "Prior turns when multi-turn conversation is enabled.",
  },
];

export const promptVariableSummary = "{{input}}, {{sourceLang}}, {{targetLang}}, {{toolName}}, {{conversation}}";
