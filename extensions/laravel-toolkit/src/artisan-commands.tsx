import { ActionPanel, List, Action, Icon } from "@raycast/api";

interface ArtisanCommand {
  name: string;
  description: string;
  usage?: string;
  category: string;
}

const ARTISAN_COMMANDS: ArtisanCommand[] = [
  // Make Commands
  {
    name: "make:controller",
    description: "Create a new controller class",
    usage: "php artisan make:controller UserController",
    category: "Make",
  },
  {
    name: "make:model",
    description: "Create a new Eloquent model class",
    usage: "php artisan make:model User -mfc",
    category: "Make",
  },
  {
    name: "make:migration",
    description: "Create a new migration file",
    usage: "php artisan make:migration create_users_table",
    category: "Make",
  },
  {
    name: "make:seeder",
    description: "Create a new seeder class",
    usage: "php artisan make:seeder UserSeeder",
    category: "Make",
  },
  {
    name: "make:factory",
    description: "Create a new model factory",
    usage: "php artisan make:factory UserFactory",
    category: "Make",
  },
  {
    name: "make:middleware",
    description: "Create a new middleware class",
    usage: "php artisan make:middleware CheckAge",
    category: "Make",
  },
  {
    name: "make:request",
    description: "Create a new form request class",
    usage: "php artisan make:request StoreUserRequest",
    category: "Make",
  },
  {
    name: "make:resource",
    description: "Create a new resource class",
    usage: "php artisan make:resource UserResource",
    category: "Make",
  },
  {
    name: "make:command",
    description: "Create a new Artisan command",
    usage: "php artisan make:command SendEmails",
    category: "Make",
  },
  {
    name: "make:event",
    description: "Create a new event class",
    usage: "php artisan make:event OrderShipped",
    category: "Make",
  },
  {
    name: "make:listener",
    description: "Create a new event listener class",
    usage: "php artisan make:listener SendShipmentNotification",
    category: "Make",
  },
  {
    name: "make:job",
    description: "Create a new job class",
    usage: "php artisan make:job ProcessPodcast",
    category: "Make",
  },
  {
    name: "make:mail",
    description: "Create a new email class",
    usage: "php artisan make:mail OrderShipped",
    category: "Make",
  },
  {
    name: "make:notification",
    description: "Create a new notification class",
    usage: "php artisan make:notification InvoicePaid",
    category: "Make",
  },
  {
    name: "make:policy",
    description: "Create a new policy class",
    usage: "php artisan make:policy PostPolicy --model=Post",
    category: "Make",
  },
  {
    name: "make:provider",
    description: "Create a new service provider class",
    usage: "php artisan make:provider RiakServiceProvider",
    category: "Make",
  },
  {
    name: "make:test",
    description: "Create a new test class",
    usage: "php artisan make:test UserTest",
    category: "Make",
  },
  {
    name: "make:component",
    description: "Create a new Blade component",
    usage: "php artisan make:component Alert",
    category: "Make",
  },
  {
    name: "make:livewire",
    description: "Create a new Livewire component",
    usage: "php artisan make:livewire Counter",
    category: "Make",
  },
  {
    name: "make:cast",
    description: "Create a new custom Eloquent cast class",
    usage: "php artisan make:cast Json",
    category: "Make",
  },
  {
    name: "make:channel",
    description: "Create a new channel class",
    usage: "php artisan make:channel OrderChannel",
    category: "Make",
  },
  {
    name: "make:exception",
    description: "Create a new custom exception class",
    usage: "php artisan make:exception InvalidOrderException",
    category: "Make",
  },
  {
    name: "make:observer",
    description: "Create a new observer class",
    usage: "php artisan make:observer UserObserver --model=User",
    category: "Make",
  },
  {
    name: "make:rule",
    description: "Create a new validation rule",
    usage: "php artisan make:rule Uppercase",
    category: "Make",
  },
  {
    name: "make:scope",
    description: "Create a new Eloquent scope",
    usage: "php artisan make:scope AncientScope",
    category: "Make",
  },

  // Database
  { name: "migrate", description: "Run the database migrations", usage: "php artisan migrate", category: "Database" },
  {
    name: "migrate:fresh",
    description: "Drop all tables and re-run all migrations",
    usage: "php artisan migrate:fresh --seed",
    category: "Database",
  },
  {
    name: "migrate:rollback",
    description: "Rollback the last database migration",
    usage: "php artisan migrate:rollback",
    category: "Database",
  },
  {
    name: "migrate:reset",
    description: "Rollback all database migrations",
    usage: "php artisan migrate:reset",
    category: "Database",
  },
  {
    name: "migrate:status",
    description: "Show the status of each migration",
    usage: "php artisan migrate:status",
    category: "Database",
  },
  {
    name: "db:seed",
    description: "Seed the database with records",
    usage: "php artisan db:seed",
    category: "Database",
  },
  {
    name: "db:wipe",
    description: "Drop all tables, views, and types",
    usage: "php artisan db:wipe",
    category: "Database",
  },

  // Cache & Config
  {
    name: "cache:clear",
    description: "Flush the application cache",
    usage: "php artisan cache:clear",
    category: "Cache",
  },
  {
    name: "config:cache",
    description: "Create a cache file for faster configuration loading",
    usage: "php artisan config:cache",
    category: "Cache",
  },
  {
    name: "config:clear",
    description: "Remove the configuration cache file",
    usage: "php artisan config:clear",
    category: "Cache",
  },
  {
    name: "route:cache",
    description: "Create a route cache file for faster route registration",
    usage: "php artisan route:cache",
    category: "Cache",
  },
  {
    name: "route:clear",
    description: "Remove the route cache file",
    usage: "php artisan route:clear",
    category: "Cache",
  },
  {
    name: "view:cache",
    description: "Compile all of the application's Blade templates",
    usage: "php artisan view:cache",
    category: "Cache",
  },
  {
    name: "view:clear",
    description: "Clear all compiled view files",
    usage: "php artisan view:clear",
    category: "Cache",
  },
  {
    name: "event:cache",
    description: "Discover and cache the application's events and listeners",
    usage: "php artisan event:cache",
    category: "Cache",
  },
  {
    name: "optimize",
    description: "Cache the framework bootstrap files",
    usage: "php artisan optimize",
    category: "Cache",
  },
  {
    name: "optimize:clear",
    description: "Remove the cached bootstrap files",
    usage: "php artisan optimize:clear",
    category: "Cache",
  },

  // Development
  {
    name: "serve",
    description: "Serve the application on the PHP development server",
    usage: "php artisan serve",
    category: "Development",
  },
  {
    name: "tinker",
    description: "Interact with your application (REPL)",
    usage: "php artisan tinker",
    category: "Development",
  },
  {
    name: "route:list",
    description: "List all registered routes",
    usage: "php artisan route:list",
    category: "Development",
  },
  {
    name: "env",
    description: "Display the current framework environment",
    usage: "php artisan env",
    category: "Development",
  },
  {
    name: "about",
    description: "Display basic information about your application",
    usage: "php artisan about",
    category: "Development",
  },

  // Queue
  {
    name: "queue:work",
    description: "Start processing jobs on the queue",
    usage: "php artisan queue:work",
    category: "Queue",
  },
  {
    name: "queue:listen",
    description: "Listen to a given queue",
    usage: "php artisan queue:listen",
    category: "Queue",
  },
  {
    name: "queue:restart",
    description: "Restart queue worker daemons after their current job",
    usage: "php artisan queue:restart",
    category: "Queue",
  },
  {
    name: "queue:failed",
    description: "List all of the failed queue jobs",
    usage: "php artisan queue:failed",
    category: "Queue",
  },
  {
    name: "queue:retry",
    description: "Retry a failed queue job",
    usage: "php artisan queue:retry all",
    category: "Queue",
  },
  {
    name: "queue:flush",
    description: "Flush all of the failed queue jobs",
    usage: "php artisan queue:flush",
    category: "Queue",
  },

  // Schedule
  {
    name: "schedule:run",
    description: "Run the scheduled commands",
    usage: "php artisan schedule:run",
    category: "Schedule",
  },
  {
    name: "schedule:list",
    description: "List all scheduled tasks",
    usage: "php artisan schedule:list",
    category: "Schedule",
  },
  {
    name: "schedule:work",
    description: "Start the schedule worker",
    usage: "php artisan schedule:work",
    category: "Schedule",
  },

  // Auth & Keys
  { name: "key:generate", description: "Set the application key", usage: "php artisan key:generate", category: "Auth" },
  {
    name: "storage:link",
    description: "Create the symbolic links configured for the application",
    usage: "php artisan storage:link",
    category: "Auth",
  },

  // Packages
  {
    name: "vendor:publish",
    description: "Publish any publishable assets from vendor packages",
    usage: "php artisan vendor:publish --provider=...",
    category: "Packages",
  },
  {
    name: "package:discover",
    description: "Rebuild the cached package manifest",
    usage: "php artisan package:discover",
    category: "Packages",
  },
];

// Group commands by category
function groupByCategory(commands: ArtisanCommand[]): Record<string, ArtisanCommand[]> {
  return commands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, ArtisanCommand[]>,
  );
}

export default function Command() {
  const grouped = groupByCategory(ARTISAN_COMMANDS);
  const categories = Object.keys(grouped);

  return (
    <List searchBarPlaceholder="Search Artisan commands...">
      {categories.map((category) => (
        <List.Section key={category} title={category}>
          {grouped[category].map((cmd) => (
            <List.Item
              key={cmd.name}
              icon={Icon.Terminal}
              title={cmd.name}
              subtitle={cmd.description}
              accessories={[{ text: category }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Command" content={cmd.usage || `php artisan ${cmd.name}`} />
                    <Action.CopyToClipboard title="Copy Command Name" content={cmd.name} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="View Documentation" url={`https://laravel.com/docs/artisan`} />
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
