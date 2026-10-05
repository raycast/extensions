import { Action, ActionPanel, List, open, showHUD } from "@raycast/api";

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  icon: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "typing-test",
    title: "Start Typing Test",
    subtitle: "Jump into a typing test immediately",
    url: "https://monkeytype.com/",
    icon: "⚡",
  },
  {
    id: "account",
    title: "My Account & Stats",
    subtitle: "View your profile, stats, and progress",
    url: "https://monkeytype.com/account",
    icon: "📊",
  },
  {
    id: "leaderboards",
    title: "Leaderboards",
    subtitle: "See top performers and rankings",
    url: "https://monkeytype.com/leaderboards",
    icon: "🏆",
  },
  {
    id: "settings",
    title: "Settings & Themes",
    subtitle: "Customize your typing experience",
    url: "https://monkeytype.com/settings",
    icon: "⚙️",
  },
  {
    id: "about",
    title: "About & Tips",
    subtitle: "Learn about Monkeytype and improve your typing",
    url: "https://monkeytype.com/about",
    icon: "💡",
  },
];

export default function MonkeytypeCommand() {
  const openMonkeytype = async (action: QuickAction) => {
    await open(action.url);
    await showHUD(`🚀 ${action.title}`);
  };

  return (
    <List>
      <List.Section title="🚀 Monkeytype Quick Access">
        {QUICK_ACTIONS.map((action) => (
          <List.Item
            key={action.id}
            icon={action.icon}
            title={action.title}
            subtitle={action.subtitle}
            actions={
              <ActionPanel>
                <Action title="Open" onAction={() => openMonkeytype(action)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
