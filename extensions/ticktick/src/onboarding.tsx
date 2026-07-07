import {
  getPreferenceValues,
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  openExtensionPreferences,
  useNavigation,
  Detail,
} from "@raycast/api";
import { markOnboardingComplete } from "./lib/useFirstRun";

interface Props {
  _firstRun?: boolean; // injected by useFirstRun when pushed automatically
}

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();
const isAS = integrationMode === "applescript";

const APPLESCRIPT_COMMANDS = [
  { icon: Icon.Sun, title: "Today", description: "View tasks due today" },
  { icon: Icon.Tray, title: "Inbox", description: "Unorganised tasks" },
  { icon: Icon.Calendar, title: "Next 7 Days", description: "Upcoming tasks" },
  { icon: Icon.List, title: "Projects", description: "Browse tasks by project" },
  { icon: Icon.MagnifyingGlass, title: "Search Tasks", description: "Search across all tasks" },
  { icon: Icon.Plus, title: "Quick Add Task", description: "Add a task instantly" },
];

const API_ONLY_COMMANDS = [
  { icon: Icon.Leaf, title: "Habits", description: "Track & check in habits" },
  { icon: Icon.Clock, title: "Pomodoro", description: "Focus timer synced with TickTick" },
  { icon: Icon.BarChart, title: "Eisenhower Matrix", description: "Urgency × importance view" },
  { icon: Icon.ExclamationMark, title: "Overdue", description: "Past-due tasks" },
  { icon: Icon.Checkmark, title: "Completed", description: "Recently completed tasks" },
  { icon: Icon.Filter, title: "Smart Lists", description: "Your TickTick smart list filters" },
  { icon: Icon.Document, title: "Templates", description: "Create tasks from templates" },
  { icon: Icon.Tag, title: "Tags", description: "Browse tasks by tag" },
  { icon: Icon.Gear, title: "Manage Projects", description: "Create, rename, or delete projects" },
  { icon: Icon.Gear, title: "Manage Tags", description: "Create, rename, or delete tags" },
  { icon: Icon.BarChart, title: "Focus Stats", description: "Pomodoro & focus statistics" },
  { icon: Icon.Trash, title: "Trash", description: "View and restore deleted tasks" },
  { icon: Icon.Monitor, title: "Menu Bar", description: "Live timer & overdue count in menu bar" },
  { icon: Icon.Bell, title: "Background Alerts", description: "Overdue & Pomodoro notifications" },
];

function WelcomeBanner({ isFirstRun, onGetStarted }: { isFirstRun: boolean; onGetStarted: () => void }) {
  const markdown = `
# ${isFirstRun ? "Welcome to TickTick for Raycast! 👋" : "Setup & Integration Guide"}

This extension supports **two integration modes** — pick the one that fits your setup:

---

## AppleScript Mode *(Default)*
Uses the **TickTick or DIDA365 Mac app** directly via AppleScript.
**No login required.** Just have the app installed.

Works with: **TickTick** and **DIDA365 (滴答清单)**

Available commands: Today · Inbox · Next 7 Days · Projects · Search · Quick Add

---

## API Mode *(Full Features)*
Connects to the **TickTick REST API** via OAuth.
Unlocks the full command set including Habits, Pomodoro, Eisenhower Matrix, and more.

Works with: **TickTick accounts only**

---

${isFirstRun ? "**Click Get Started below to begin.**\n\nYou can always change your mode in *Raycast Settings → Extensions → TickTick → Integration Mode*." : "Change your mode in *Raycast Settings → Extensions → TickTick → Integration Mode*."}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {isFirstRun && (
            <Action
              title="Get Started"
              icon={Icon.ArrowRight}
              onAction={onGetStarted}
            />
          )}
          <Action
            title="Open Preferences to Switch Mode"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Onboarding({ _firstRun = false }: Props) {
  const { pop } = useNavigation();

  async function handleGetStarted() {
    await markOnboardingComplete();
    pop();
  }

  // On first run, show the welcome detail screen instead of the full list
  if (_firstRun) {
    return <WelcomeBanner isFirstRun onGetStarted={handleGetStarted} />;
  }

  // Full guide — accessible any time via "Setup & Integration Guide" command
  return (
    <List navigationTitle="TickTick — Setup & Integration Guide" searchBarPlaceholder="Filter commands...">

      <List.Section
        title={isAS ? "Current Mode: AppleScript (Default)" : "Current Mode: API — Full Features"}
        subtitle={isAS ? "Using TickTick / DIDA365 Mac app — no login required" : "Connected via TickTick OAuth"}
      >
        <List.Item
          icon={{ source: Icon.Gear, tintColor: Color.Blue }}
          title="Switch Integration Mode"
          subtitle="Open extension preferences"
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section
        title="AppleScript Mode — TickTick & DIDA365"
        subtitle="No login · Requires Mac app"
      >
        {APPLESCRIPT_COMMANDS.map((cmd) => (
          <List.Item
            key={cmd.title}
            icon={{ source: cmd.icon, tintColor: isAS ? Color.Green : Color.SecondaryText }}
            title={cmd.title}
            subtitle={cmd.description}
            accessories={[
              isAS
                ? { tag: { value: "Active", color: Color.Green } }
                : { tag: { value: "Also in API", color: Color.SecondaryText } },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section
        title="API Mode Only — Full Feature Set"
        subtitle="Requires TickTick OAuth login"
      >
        {API_ONLY_COMMANDS.map((cmd) => (
          <List.Item
            key={cmd.title}
            icon={{ source: cmd.icon, tintColor: isAS ? Color.SecondaryText : Color.Green }}
            title={cmd.title}
            subtitle={cmd.description}
            accessories={[
              isAS
                ? { tag: { value: "Switch to API", color: Color.Orange } }
                : { tag: { value: "Active", color: Color.Green } },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

    </List>
  );
}
