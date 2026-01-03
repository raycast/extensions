import { ActionPanel, List, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  projectDirectory?: string;
}

interface QuickCommand {
  name: string;
  command: string;
  description: string;
  category: string;
}

const QUICK_COMMANDS: QuickCommand[] = [
  // Common
  { name: "Serve", command: "serve", description: "Start development server", category: "Common" },
  { name: "Tinker", command: "tinker", description: "Start REPL session", category: "Common" },
  { name: "Route List", command: "route:list", description: "List all routes", category: "Common" },

  // Database
  { name: "Migrate", command: "migrate", description: "Run migrations", category: "Database" },
  { name: "Migrate Fresh", command: "migrate:fresh", description: "Drop all tables and migrate", category: "Database" },
  {
    name: "Migrate Fresh + Seed",
    command: "migrate:fresh --seed",
    description: "Fresh migrate with seeding",
    category: "Database",
  },
  { name: "Seed", command: "db:seed", description: "Run seeders", category: "Database" },
  { name: "Rollback", command: "migrate:rollback", description: "Rollback last migration", category: "Database" },

  // Cache
  { name: "Clear All Cache", command: "optimize:clear", description: "Clear all cached data", category: "Cache" },
  { name: "Cache Config", command: "config:cache", description: "Cache configuration", category: "Cache" },
  { name: "Cache Routes", command: "route:cache", description: "Cache routes", category: "Cache" },
  { name: "Cache Views", command: "view:cache", description: "Cache Blade views", category: "Cache" },
  { name: "Clear Cache", command: "cache:clear", description: "Clear application cache", category: "Cache" },

  // Queue
  { name: "Queue Work", command: "queue:work", description: "Start queue worker", category: "Queue" },
  { name: "Queue Listen", command: "queue:listen", description: "Listen to queue", category: "Queue" },
  { name: "Queue Restart", command: "queue:restart", description: "Restart queue workers", category: "Queue" },

  // Testing
  { name: "Run Tests", command: "test", description: "Run PHPUnit/Pest tests", category: "Testing" },
  {
    name: "Run Tests (Parallel)",
    command: "test --parallel",
    description: "Run tests in parallel",
    category: "Testing",
  },
];

// Group commands by category
function groupByCategory(commands: QuickCommand[]): Record<string, QuickCommand[]> {
  return commands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, QuickCommand[]>,
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const grouped = groupByCategory(QUICK_COMMANDS);
  const categories = Object.keys(grouped);

  async function runArtisan(command: string) {
    const projectDir = preferences.projectDirectory;

    if (!projectDir) {
      showToast({
        style: Toast.Style.Failure,
        title: "No project directory set",
        message: "Please set a Laravel project directory in extension preferences",
      });
      return;
    }

    setIsLoading(true);

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Running: php artisan ${command}`,
      });

      const { stdout } = await execAsync(`cd "${projectDir}" && php artisan ${command}`);

      toast.style = Toast.Style.Success;
      toast.title = "Command completed";
      toast.message = stdout.slice(0, 100) || "Success";

      // For serve command, keep it running
      if (command === "serve") {
        toast.message = "Server running at http://127.0.0.1:8000";
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Command failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Artisan commands to run...">
      {!preferences.projectDirectory && (
        <List.EmptyView
          title="No Project Directory Set"
          description="Please set your Laravel project directory in extension preferences (⌘ + ,)"
        />
      )}

      {preferences.projectDirectory &&
        categories.map((category) => (
          <List.Section key={category} title={category}>
            {grouped[category].map((cmd) => (
              <List.Item
                key={cmd.command}
                icon="🚀"
                title={cmd.name}
                subtitle={`php artisan ${cmd.command}`}
                accessories={[{ text: category }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action title={`Run: PHP Artisan ${cmd.command}`} onAction={() => runArtisan(cmd.command)} />
                      <Action.CopyToClipboard title="Copy Command" content={`php artisan ${cmd.command}`} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.OpenWith title="Open Project in Editor" path={preferences.projectDirectory || ""} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
