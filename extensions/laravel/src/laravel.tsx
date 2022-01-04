import { ActionPanel, List, OpenInBrowserAction, CopyToClipboardAction, showToast, ToastStyle } from "@raycast/api";
import { useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";

export default function main() {
  const algoliaClient = useMemo(() => {
    return algoliasearch("E3MIRNPJH5", "1fa3a8fec06eb1858d6ca137211225c0");
  }, []);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex("laravel");
  }, []);

  const [searchResults, setSearchResults] = useState(documentation);
  const [isLoading, setIsLoading] = useState(false);

  const search = async (query = "") => {
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        facetFilters: ["version:8.x"],
        hitsPerPage: 20,
      })
      .then((response) => {
        setIsLoading(false);
        return {
          "Results...": response.hits.map((result: any) => {
            return {
              title: title(result),
              subtitle: subtitle(result),
              url: result.url,
            };
          }),
        };
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(ToastStyle.Failure, "Algolia Error", err.message);
        return [];
      });
  };

  const title = (result: any) => {
    const hierarchy = Object.values(
      Object.entries(result.hierarchy).reduce((a: any, [k, v]) => (v ? ((a[k] = v), a) : a), {})
    );

    return Object.values(hierarchy).reverse()[0];
  };

  const subtitle = (result: any) => {
    if (result.content) {
      return result.content;
    }

    return Object.values(Object.entries(result.hierarchy).reduce((a: any, [k, v]) => (v ? ((a[k] = v), a) : a), {}))
      .reverse()
      .filter((item, index) => index != 0)
      .join(" » ");
  };

  return (
    <List
      throttle={true}
      isLoading={isLoading || searchResults === undefined}
      onSearchTextChange={async (query) => setSearchResults(query.length > 1 ? await search(query) : documentation)}
    >
      {Object.entries(searchResults).map(([section, items]: Array<any>) => (
        <List.Section title={section} key={section}>
          {items.map((item : any) => (
            <List.Item
              key={item.url}
              icon="laravel-logo.png"
              title={item.title}
              subtitle={item.subtitle ?? ""}
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url} title="Open in Browser" />
                  <CopyToClipboardAction content={item.url} title="Copy URL" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const documentation : any = {
  "Getting Started": [
    {
      url: "https://laravel.com/docs/8.x/installation",
      title: "Installation",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/configuration",
      title: "Configuration",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/structure",
      title: "Directory Structure",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/starter-kits",
      title: "Starter Kits",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/deployment",
      title: "Deployment",
      subtitle: null,
    },
  ],
  "Architecture Concepts": [
    {
      url: "https://laravel.com/docs/8.x/lifecycle",
      title: "Request Lifecycle",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/container",
      title: "Service Container",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/providers",
      title: "Service Providers",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/facades",
      title: "Facades",
      subtitle: null,
    },
  ],
  "The Basics": [
    {
      url: "https://laravel.com/docs/8.x/routing",
      title: "Routing",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/middleware",
      title: "Middleware",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/csrf",
      title: "CSRF Protection",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/controllers",
      title: "Controllers",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/requests",
      title: "Requests",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/responses",
      title: "Responses",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/views",
      title: "Views",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/blade",
      title: "Blade Templates",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/urls",
      title: "URL Generation",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/session",
      title: "Session",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/validation",
      title: "Validation",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/errors",
      title: "Error Handling",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/logging",
      title: "Logging",
      subtitle: null,
    },
  ],
  "Digging Deeper": [
    {
      url: "https://laravel.com/docs/8.x/artisan",
      title: "Artisan Console",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/broadcasting",
      title: "Broadcasting",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/cache",
      title: "Cache",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/collections",
      title: "Collections",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/mix",
      title: "Compiling Assets",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/contracts",
      title: "Contracts",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/events",
      title: "Events",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/filesystem",
      title: "File Storage",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/helpers",
      title: "Helpers",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/http-client",
      title: "HTTP Client",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/localization",
      title: "Localization",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/mail",
      title: "Mail",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/notifications",
      title: "Notifications",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/packages",
      title: "Package Development",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/queues",
      title: "Queues",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/rate-limiting",
      title: "Rate Limiting",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/scheduling",
      title: "Task Scheduling",
      subtitle: null,
    },
  ],
  Security: [
    {
      url: "https://laravel.com/docs/8.x/authentication",
      title: "Authentication",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/authorization",
      title: "Authorization",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/verification",
      title: "Email Verification",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/encryption",
      title: "Encryption",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/hashing",
      title: "Hashing",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/passwords",
      title: "Password Reset",
      subtitle: null,
    },
  ],
  Database: [
    {
      url: "https://laravel.com/docs/8.x/database",
      title: "Getting Started",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/queries",
      title: "Query Builder",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/pagination",
      title: "Pagination",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/migrations",
      title: "Migrations",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/seeding",
      title: "Seeding",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/redis",
      title: "Redis",
      subtitle: null,
    },
  ],
  "Eloquent ORM": [
    {
      url: "https://laravel.com/docs/8.x/eloquent",
      title: "Getting Started",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/eloquent-relationships",
      title: "Relationships",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/eloquent-collections",
      title: "Collections",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/eloquent-mutators",
      title: "Mutators / Casts",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/eloquent-resources",
      title: "API Resources",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/eloquent-serialization",
      title: "Serialization",
      subtitle: null,
    },
  ],
  Testing: [
    {
      url: "https://laravel.com/docs/8.x/testing",
      title: "Getting Started",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/http-tests",
      title: "HTTP Tests",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/console-tests",
      title: "Console Tests",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/dusk",
      title: "Browser Tests",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/database-testing",
      title: "Database",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/mocking",
      title: "Mocking",
      subtitle: null,
    },
  ],
  Packages: [
    {
      url: "https://laravel.com/docs/8.x/starter-kits#laravel-breeze",
      title: "Breeze",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/billing",
      title: "Cashier (Stripe)",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/cashier-paddle",
      title: "Cashier (Paddle)",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/dusk",
      title: "Dusk",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/envoy",
      title: "Envoy",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/fortify",
      title: "Fortify",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/homestead",
      title: "Homestead",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/horizon",
      title: "Horizon",
      subtitle: null,
    },
    {
      url: "https://jetstream.laravel.com",
      title: "Jetstream",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/octane",
      title: "Octane",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/passport",
      title: "Passport",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/sail",
      title: "Sail",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/sanctum",
      title: "Sanctum",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/scout",
      title: "Scout",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/socialite",
      title: "Socialite",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/telescope",
      title: "Telescope",
      subtitle: null,
    },
    {
      url: "https://laravel.com/docs/8.x/valet",
      title: "Valet",
      subtitle: null,
    },
    {
      url: "/api/8.x",
      title: "API Documentation",
      subtitle: null,
    },
  ],
};
