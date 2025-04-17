import { App } from "./apps";

export const ENVIRONMENTS_BY_APP = {
  [App.LeChat]: [
    {
      id: "staging",
      helmChart: "flux/staging/chat/ui/ask-ui.helmrelease.yaml",
      icon: "🌕",
    },
    {
      id: "staging-dev-1",
      helmChart: "flux/staging/chat/ui/ask-ui-dev-1.helmrelease.yaml",
      icon: "🌕",
    },
    {
      id: "staging-dev-2",
      helmChart: "flux/staging/chat/ui/ask-ui-dev-2.helmrelease.yaml",
      icon: "🌕",
    },
    {
      id: "preprod",
      helmChart: "flux/preprod/chat/ui/ask-ui.helmrelease.yaml",
      icon: "🟠",
    },
    {
      id: "preprod-dev-1",
      helmChart: "flux/preprod/chat/ui/ask-ui-dev-1.helmrelease.yaml",
      icon: "🟠",
    },
    {
      id: "blue",
      helmChart: "flux/production-gcp/chat/ui/ask-ui-blue.helmrelease.yaml",
      icon: "🔵",
    },
  ],
  [App.SettingsManager]: [
    {
      id: "staging",
      helmChart:
        "flux/staging/console/settings/settings-manager.helmrelease.yaml",
      icon: "🌕",
    },
    {
      id: "staging-dev-1",
      helmChart:
        "flux/staging/console/settings/settings-manager-dev-1.helmrelease.yaml",
      icon: "🌕",
    },
    {
      id: "preprod",
      helmChart:
        "flux/preprod/console/settings/settings-manager.helmrelease.yaml",
      icon: "🟠",
    },
  ],
  [App.LaConsole]: [
    {
      id: "staging",
      helmChart: "flux/staging/console/dashboard/dashboard-ui.helmrelease.yaml",
      icon: "🌕",
    },
    {
      id: "preprod",
      helmChart: "flux/preprod/console/dashboard/dashboard-ui.helmrelease.yaml",
      icon: "🟠",
    },
  ],
  [App.Editorial]: [
    {
      id: "staging",
      helmChart: "flux/staging/internal/editorial/editorial.helmrelease.yaml",
      icon: "🌕",
    },
    {
      id: "prod",
      helmChart: "flux/production/vortex/editorial/editorial.helmrelease.yaml",
      icon: "🟠",
    },
  ],
};
