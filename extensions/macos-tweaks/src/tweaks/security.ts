import type { TweakDefinition } from "../types";

export const securityTweaks: TweakDefinition[] = [
  {
    id: "security-password-delay",
    title: "Require Password Immediately After Sleep",
    description: "Require password immediately when waking from sleep or screen saver",
    category: "security",
    domain: "com.apple.screensaver",
    key: "askForPasswordDelay",
    type: "enum",
    defaultValue: 5,
    options: [
      { title: "Immediately (0s)", value: 0 },
      { title: "5 seconds", value: 5 },
      { title: "1 minute", value: 60 },
      { title: "5 minutes", value: 300 },
    ],
    risk: "safe",
    tags: ["password", "lock", "sleep"],
  },
  {
    id: "security-disable-quarantine",
    title: "Disable App Quarantine Warning",
    description: 'Disable the "Are you sure you want to open this?" dialog for downloaded apps',
    category: "security",
    domain: "com.apple.LaunchServices",
    key: "LSQuarantine",
    type: "boolean",
    defaultValue: true,
    risk: "moderate",
    tags: ["gatekeeper", "quarantine", "downloads"],
  },
];
