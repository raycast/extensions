# Quick Jump

<div align="center">
  <img src="assets/icon.png" width="120" alt="Quick Jump Icon" />
  <br>
  <em>⚡ Jump to your favorite links in seconds ⚡</em>
</div>

---

Quick Jump is a Raycast extension designed to give you and your team quick, organized access to all your essential project links. With Quick Jump, you can build a config file for your Git repositories, dashboards, databases, and internal tools, accessible with just a few keystrokes.

## Features

-   **Centralized Configuration:** Define all your links from GitLab repositories to Grafana dashboards in a single, easy-to-manage JSON file.
-   **Powerful Templating:** Create dynamic URLs for common patterns (e.g., Kibana logs, Project dashboard, Git Urls) using placeholders.
-   **Template Groups:** Reduce configuration duplication by grouping common templates and applying them with a single line.
-   **Smart Search:** Instantly find what you need by searching across group names, group titles, URL titles, tags (including tags on group-specific URLs), and even URL domains.
-   **"Open In" Integration:** Go beyond the browser and open links directly in their native applications, like VS Code or IntelliJ IDEA. Works with all URL types: regular URLs, group-specific URLs, and templates.
-   **Local Icons:** Use local icon files for groups, URLs, and templates, plus automatic application icons for "Open In" actions.
-   **Quick Editing:** An "Open Config File" action is built right in, so you can add or update your links.

## Configuration

1.  After installing the extension, open the "Search" command.
2.  Raycast will prompt you to set the **JSON File Path** in the extension's preferences.

### JSON File Structure

The JSON file has four main sections: `groups`, `urls`, `templates`, and `templateGroups`.

```json
{
  "groups": {
    "my-project": {
      "title": "My Awesome Project",
      "icon": "project.png",
      "linkedUrls": ["gitlab-repo", "project-dashboard"],
      "otherUrls": {
        "staging-env": {
          "title": "Staging Environment",
          "url": "https://staging.my-project.com",
          "icon": "dashboard.png",
          "tags": ["staging", "environment"],
          "openIn": "com.microsoft.VSCode"
        },
        "local-dev": {
          "url": "http://localhost:3000",
          "openIn": "Google Chrome"
        }
      },
      "templatePlaceholders": {
        "key": "my-project-name",
        "path": "/path/to/project"
      },
      "appliedTemplateGroups": ["default-templates"],
      "tags": ["project", "frontend"]
    }
  },
  "urls": {
    "gitlab-repo": {
      "title": "My Project Repo",
      "url": "https://gitlab.com/your-org/my-project",
      "icon": "gitlab.png",
      "tags": ["git", "source-code"],
      "openIn": "com.google.Chrome"
    },
    "project-dashboard": {
      "title": "Project Dashboard",
      "url": "https://grafana.company.net/d/project-overview",
      "icon": "grafana.png",
      "templatePlaceholders": {
        "key": "my-project-123",
        "cluster-name": "foo"
      },
      "appliedTemplateGroups": ["dashboard-templates"],
      "tags": ["monitoring", "dashboard"]
    },
    "couchbase-cluster": {
      "title": "Couchbase Cluster",
      "url": "https://couchbase.company.net",
      "icon": "couchbase.png",
      "templatePlaceholders": {
        "bucket-name": "user-data"
      },
      "appliedTemplates": ["bucket-stats", "bucket-docs"],
      "tags": ["database", "nosql"]
    }
  },
  "templates": {
    "project-logs": {
      "title": "Project Logs",
      "templateUrl": "https://your-logging-url.company.net/browse/${key}",
      "icon": "kibana.png",
      "tags": ["logging", "debugging"]
    },
    "cluster-monitoring": {
      "title": "Cluster Monitoring",
      "templateUrl": "https://monitoring.company.net/cluster/${cluster-name}",
      "icon": "grafana.png",
      "tags": ["monitoring", "cluster"]
    },
    "bucket-stats": {
      "title": "Bucket Statistics",
      "templateUrl": "https://couchbase.company.net/buckets/${bucket-name}/stats",
      "icon": "couchbase.png",
      "tags": ["stats", "bucket"]
    },
    "bucket-docs": {
      "title": "Bucket Documents",
      "templateUrl": "https://couchbase.company.net/buckets/${bucket-name}/docs",
      "icon": "couchbase.png",
      "tags": ["docs", "bucket"]
    },
    "jira-ticket": {
      "title": "Jira Ticket",
      "templateUrl": "https://your-org.atlassian.net/browse/${key}",
      "icon": "jira.png",
      "tags": ["ticket", "issue"]
    },
    "open-in-code": {
      "title": "Open in VSCode",
      "templateUrl": "vscode://file/${path}",
      "openIn": "com.microsoft.VSCode"
    },
    "open-in-intellij": {
      "title": "Open in IntelliJ",
      "templateUrl": "idea://open?file=${path}",
      "openIn": "com.jetbrains.intellij"
    }
  },
  "templateGroups": {
    "default-templates": {
      "appliedTemplates": [
        "project-logs",
        "jira-ticket",
        "open-in-code",
        "open-in-intellij"
      ]
    },
    "dashboard-templates": {
      "appliedTemplates": ["project-logs", "cluster-monitoring"]
    }
  }
}
```

-   **groups:** The main organizational unit. A group can link to shared URLs (`linkedUrls`), define group-specific URLs (`otherUrls`), apply templates, and define its own placeholder values. Each group can have an optional `title` for display purposes (if not provided, the group key is used as the title). URLs in `otherUrls` can have their own titles, icons, tags, and `openIn` applications.
-   **urls:** A library of shared, static URLs that can be referenced by one or more groups. URLs can also have their own templates and template groups applied. Each URL can have an optional `title` for display purposes (if not provided, the URL key is used as the title). URLs also support the `openIn` field to specify which application should open the URL.
-   **templates:** Reusable URL patterns. Any instance of `${key}` will be replaced by the `templatePlaceholders` defined in the group or URL.
-   **templateGroups:** A powerful feature to reduce repetition. Define a set of templates here and apply them to your groups or URLs using the `appliedTemplateGroups` property.

### Icons

The extension comes with a set of predefined PNG icons for common services and tools. You can reference these icons by their filename in your JSON configuration.

#### Fallback Icon

When no icon is specified, the extension automatically uses `icon.png` as the fallback icon for all entity types (groups, URLs, templates). This ensures a consistent visual experience even when icons are not explicitly configured.

#### Predefined Icons

The following icons are available in the `assets` folder:

- <img src="assets/github.png" width="20" alt="GitHub"> `github.png` - GitHub repositories and services
- <img src="assets/gitlab.png" width="20" alt="GitLab"> `gitlab.png` - GitLab repositories and services
- <img src="assets/database.png" width="20" alt="Database"> `database.png` - General database icons
- <img src="assets/couchbase.png" width="20" alt="Couchbase"> `couchbase.png` - Couchbase database
- <img src="assets/bigquery.png" width="20" alt="BigQuery"> `bigquery.png` - Google BigQuery
- <img src="assets/kafka.png" width="20" alt="Kafka"> `kafka.png` - Apache Kafka
- <img src="assets/grafana.png" width="20" alt="Grafana"> `grafana.png` - Grafana dashboards
- <img src="assets/kibana.png" width="20" alt="Kibana"> `kibana.png` - Kibana logs and analytics
- <img src="assets/dashboard.png" width="20" alt="Dashboard"> `dashboard.png` - General dashboard icons
- <img src="assets/metabase.png" width="20" alt="Metabase"> `metabase.png` - Metabase analytics
- <img src="assets/google-cloud.png" width="20" alt="Google Cloud"> `google-cloud.png` - Google Cloud Platform
- <img src="assets/kubernetes.png" width="20" alt="Kubernetes"> `kubernetes.png` - Kubernetes clusters
- <img src="assets/argocd.png" width="20" alt="ArgoCD"> `argocd.png` - ArgoCD deployments
- <img src="assets/airflow.png" width="20" alt="Airflow"> `airflow.png` - Apache Airflow
- <img src="assets/jira.png" width="20" alt="Jira"> `jira.png` - Jira tickets and projects
- <img src="assets/google-sheets.png" width="20" alt="Google Sheets"> `google-sheets.png` - Google Sheets
- <img src="assets/swagger.png" width="20" alt="Swagger"> `swagger.png` - API documentation
- <img src="assets/project.png" width="20" alt="Project"> `project.png` - General project icons

#### Adding Custom Icons

If you need icons for services not included above, you have several options:

1. **Absolute file paths**: Use the full path to any PNG file on your system
2. **Web URLs**: Use direct URLs to PNG files (e.g., `"icon": "https://example.com/icon.png"`)

## Using Templates and the `openIn` Field

You can define templates for URLs that require dynamic values. Use `${placeholder}` syntax in the `templateUrl`, and the extension will prompt you to fill in those values.

You can also specify the application to open the URL with the `openIn` field for any URL type (regular URLs, other URLs in groups, and templates). This can be:
- The app's name (e.g., `"Google Chrome"`, `"Visual Studio Code"`)
- The app's bundle ID (e.g., `"com.google.Chrome"`, `"com.microsoft.VSCode"`)
- The app's path (e.g., `"/Applications/Google Chrome.app"`, `"/Applications/Visual Studio Code.app"`)

**Example: Regular URL with openIn**
```json
{
  "urls": {
    "gitlab-repo": {
      "title": "My Project Repo",
      "url": "https://gitlab.com/your-org/my-project",
      "openIn": "com.google.Chrome"
    }
  }
}
```

**Example: Other URL in Group with openIn**
```json
{
  "groups": {
    "my-project": {
      "otherUrls": {
        "staging-env": {
          "title": "Staging Environment",
          "url": "https://staging.my-project.com",
          "openIn": "company.thebrowser.Browser"
        }
      }
    }
  }
}
```

**Example: Template with openIn**

```json
{
  "title": "Open Jira Ticket",
  "templateUrl": "https://jira.company.com/browse/${ticketId}",
  "openIn": "Google Chrome"
}
```
- When you use this template, the extension will open the generated URL in Google Chrome instead of your default browser.

**Example: Open in Visual Studio Code**

```json
{
  "title": "Open in VS Code",
  "templateUrl": "${projectPath}",
  "openIn": "Visual Studio Code"
}
```
- This will open the specified file or folder in Visual Studio Code.

#### How to Find the Correct `openIn` Value
- **App Name**: The visible name in your Applications folder (e.g., `"Google Chrome"`, `"Visual Studio Code"`).
- **Bundle ID**: The unique identifier for the app (e.g., `"com.google.Chrome"`, `"com.microsoft.VSCode"`).
  - **Recommended:** Use Raycast's built-in "Copy Bundle Identifier" action. Just search for the app in Raycast, open the action panel (Tab), and select "Copy Bundle Identifier".
  - **Alternative:** Use the `mdls` command in Terminal:
    ```sh
    mdls -name kMDItemCFBundleIdentifier /Applications/Google\ Chrome.app
    mdls -name kMDItemCFBundleIdentifier /Applications/Visual\ Studio\ Code.app
    ```
- **App Path**: The full path to the `.app` bundle (e.g., `"/Applications/Google Chrome.app"`).

If `openIn` is omitted, the URL will open in your default browser.

## Acknowledgments

- [Jump icons created by Eucalyp - Flaticon](https://www.flaticon.com/free-icons/jump)

## Icon Usage Notice:

All product icons (e.g., GitLab, Grafana) are trademarks of their respective owners. They are used here solely to visually represent links to those services in a private productivity tool. This extension is not affiliated with or endorsed by any of the referenced companies.
