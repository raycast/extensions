const messages = {
  "section.needsInput": "Waiting for You",
  "section.running": "Running",
  "section.done": "Completed",
  "status.ready": "Turn ended",
  "status.unknown": "Status unknown",
  "status.cloudUnavailable": "Cloud status unavailable",
  "host.cloud": "Claude cloud conversation",
  "hud.cloudSubscribed": "Subscribed: {title} (cloud status unavailable)",
  "meta.cloudUnavailable":
    "This cloud session is saved and can be reopened from Subscriptions. Cloud execution status is not connected, so waiting-for-input alerts are unavailable.",
  "status.idle": "Not started",
  "attention.interrupted": "Interrupted",
  "meta.status": "Status",
  "section.subscribed": "Subscribed",

  "nav.inbox": "Subscriptions",
  "nav.all": "All Sessions",
  "nav.setup": "Connect an Agent",
  "nav.menuBar": "Agent Inbox · Subscribed Sessions",
  "filter.title": "Filter Sessions",
  "search.placeholder": "Search",
  "search.allPlaceholder": "Search titles and conversation content",
  "search.titlesPlaceholder": "Search conversation titles and projects",
  "search.enable": "Set Up Full-Text Search",
  "search.disabledDescription": "Enable Full-Text Search in extension preferences to search conversation content",
  "search.indexing": "Indexing conversation content {n}/{total}",
  "search.indexingDesc": "Titles are searchable now; content results fill in as indexing completes",
  "search.indexFailed": "Some conversations could not be indexed",
  "search.indexFailedDesc": "{n} transcripts could not be read; title search is available. Press ⌘R to retry",
  "search.contentMatch": "Conversation content match",

  "action.jump": "Jump to Session",
  "action.handled": "Mark as Handled",
  "action.unhandled": "Move Back to Subscriptions",
  "action.subscribe": "Subscribe",
  "action.subscribeCurrent": "Subscribe to Current Conversation",
  "action.openAll": "Browse All Sessions",
  "action.unsubscribe": "Unsubscribe",
  "action.detail": "Show Details",
  "action.hideDetail": "Hide Details",
  "action.archiveDone": "Archive Completed",
  "action.openInbox": "Open Subscriptions",
  "action.openSetup": "Connect an Agent",
  "action.install": "Connect",
  "action.reinstall": "Reconnect",
  "action.uninstall": "Remove Hooks",
  "action.openFolder": "Open Folder",
  "action.refresh": "Refresh",
  "action.preferences": "Open Extension Preferences",

  "host.app": "Desktop",
  "host.cli": "CLI",
  "agent.claude": "Claude",
  "agent.codex": "Codex",

  "meta.agent": "Agent",
  "meta.project": "Project",
  "meta.started": "Started",
  "meta.activity": "Last Activity",
  "meta.noSummary": "No messages yet",

  "attention.input": "Waiting for input",
  "attention.question": "Asked you a question",
  "attention.permission": "Needs permission",
  "attention.failed": "Failed",
  "attention.quota": "Out of quota",

  "time.justNow": "just now",
  "time.minutes": "{n} min ago",
  "time.hours": "{n} h ago",
  "time.yesterday": "yesterday",
  "time.days": "{n} d ago",
  "time.since": "since {t}",
  "time.today": "today {t}",

  "empty.inbox.title": "No subscribed sessions",
  "empty.inbox.desc": "Subscribe in All Sessions to follow progress and jump back",
  "empty.onboard.title": "No agent connected yet",
  "empty.onboard.desc": "Choose Connect an Agent from the action menu, then subscribe to a session",
  "empty.all.title": "No sessions found",
  "empty.all.desc": "Nothing in ~/.claude/projects or ~/.codex/sessions",
  "empty.menu": "No subscribed sessions",
  "empty.filter.desc": "Try another filter or search term",

  "hud.subscribed": "Subscribed · {title}",
  "hud.unsubscribed": "Unsubscribed · {title}",
  "hud.handled": "Handled · {title}",
  "hud.archived": "Archived {n} completed sessions",
  "hud.notFound": "Couldn't identify the current session; select it in All Sessions",
  "hud.focusPermission": "Can't read the window; check Raycast's Accessibility and Automation permissions",
  "hud.alreadySubscribed": "Already subscribed · {title}",
  "toast.jumpFailed": "Couldn't jump back",
  "toast.copiedId": "Session ID copied — paste it in the app",
  "toast.resumed": "Resumed in a new terminal",
  "toast.installing": "Connecting {name}",
  "toast.installed": "{name} connected",
  "toast.uninstalled": "Hooks removed for {name}",
  "toast.installFailed": "Connection failed",
  "toast.uninstallFailed": "Removal failed",
  "toast.error": "Something went wrong",

  "confirm.jumpTitle": "Jump back to {target}?",
  "confirm.cancel": "Cancel",

  "setup.ready": "Installed",
  "setup.install": "Not Connected",
  "setup.installing": "Connecting",
  "setup.installNotDetected": "Connection could not be verified. Try again.",
  "setup.notFound": "Not found",
  "setup.claudeHosts": "CLI · Desktop",
  "setup.codexHosts": "CLI · Desktop",
  "setup.uninstallIntro": "Only the entries written by this extension are removed.",
  "setup.nodeMissing": "Node.js was not found. Hooks need it to run.",
  "setup.codexHooksNote": "Codex asks you to approve new hooks once: run /hooks inside Codex.",

  "notify.waiting": "Waiting for you",
} as const;

export type MessageKey = keyof typeof messages;
export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translator(): Translator {
  return (key, vars) => {
    let value: string = messages[key];
    if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.split(`{${name}}`).join(String(replacement));
    return value;
  };
}
