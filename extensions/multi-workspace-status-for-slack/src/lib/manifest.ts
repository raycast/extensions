export const SLACK_APPS_URL = "https://api.slack.com/apps?new_app=1";

export const SLACK_APP_MANIFEST = JSON.stringify(
  {
    display_information: {
      name: "Raycast Multi-Workspace Status",
      description: "Sets my Slack status from Raycast.",
    },
    oauth_config: {
      scopes: {
        user: ["users.profile:write"],
      },
    },
    settings: {
      org_deploy_enabled: false,
      socket_mode_enabled: false,
      token_rotation_enabled: false,
    },
  },
  null,
  2,
);
