import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { readConfigFile } from "./util/file_operations";
import { Config, CustomLink, Database, GrafanaDashboard, Project, TemplateUrl } from "./util/interfaces";
import { generateSearchKeywords, getActions, handleCopyToClipboard, handleOpenLink } from "./util/util";
import {
  APP_NAME_PLACEHOLDER,
  DB_CLUSTER_NAME_PLACEHOLDER,
  DC_PLACEHOLDER,
  TEMPLATE_TYPE_DATABASE_DASHBOARD,
  TEMPLATE_TYPE_PROJECT
} from "./util/constants";

export default function Command() {
  const pref = useMemo(() => getPreferenceValues(), []);
  const [config, setConfig] = useState<Config | null>(null);
  const [databaseMap, setDatabaseMap] = useState<Map<number, Database>>(new Map());
  const [grafanaDashboardMap, setGrafanaDashboardMap] = useState<Map<number, GrafanaDashboard>>(new Map());
  const [projectTemplates, setProjectTemplates] = useState<TemplateUrl[] | undefined>([]);
  const [databaseDashboardTemplates, setDatabaseDashboardTemplates] = useState<TemplateUrl[] | undefined>([]);
  const [ready, setReady] = useState(false);
  const [, setLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    readConfigFile(pref.configPath, pref.sortAlphabetically)
      .then((configData: Config) => {
        const databaseIdMap = new Map<number, Database>(
          configData.databases?.map(database => [database.id, database])
        );
        const grafanaDashboardMap = new Map<number, GrafanaDashboard>(
          configData.grafanaDashboards?.map(dashboard => [dashboard.id, dashboard])
        );

        const projectTemplateUrls = configData?.templates?.filter(t => t.type == TEMPLATE_TYPE_PROJECT);
        const databaseDashboardTemplateUrls = configData?.templates?.filter(t => t.type === TEMPLATE_TYPE_DATABASE_DASHBOARD);

        setDatabaseMap(databaseIdMap);
        setGrafanaDashboardMap(grafanaDashboardMap);
        setProjectTemplates(projectTemplateUrls);
        setDatabaseDashboardTemplates(databaseDashboardTemplateUrls);
        setConfig(configData);
        setReady(true);
      })
      .catch((err) => {
        showToast({ title: err.message, style: Toast.Style.Failure });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const renderProjects = () => {
    return <List.Section title="Projects" key="projects">
      {
        config?.projects?.map((project, index) => {
            const dashboards = (project.grafanaDashboardIds ?? [])
              .filter(dashboardId => grafanaDashboardMap.has(dashboardId))
              .map(dashboardId => grafanaDashboardMap.get(dashboardId)!);

            const databases = (project.databaseIds ?? [])
              .filter(databaseId => databaseMap.has(databaseId))
              .map(databaseId => databaseMap.get(databaseId)!);

            return (<List.Item
              key={`project-${index}-${project.name}`}
              title={project.name}
              icon={Icon.Terminal}
              keywords={["project", "app", "repository", ...generateSearchKeywords(project.name)]}
              actions={
                <ActionPanel>
                  <Action title="Select" key="project-actions" onAction={() => push(
                    <List>
                      {renderDashboards(project.name, dashboards)}
                      {renderDatabases(project.name, databases)}
                      {renderCustomLinks(project.name, project.customLinks)}
                      {renderProjectTemplates(project, projectTemplates)}
                    </List>
                  )} />
                </ActionPanel>
              }
            />);
          }
        )
      }
    </List.Section>;
  };

  const renderDashboards = (projectName: string, grafanaDashboards: GrafanaDashboard[] | undefined) => {
    if (!grafanaDashboards || grafanaDashboards.length === 0) return null;

    return <>
      <List.Section title="Grafana Dashboards" key={`dashboard-${projectName}`}>
        {
          grafanaDashboards.map((grafanaDashboard, index) => (
            <List.Item
              key={`dashboard-${index}-${projectName}-${grafanaDashboard.id}`}
              title={grafanaDashboard.name}
              subtitle={grafanaDashboard.url}
              icon={Icon.LineChart}
              keywords={["dashboard", "grafana", ...generateSearchKeywords(projectName), ...generateSearchKeywords(grafanaDashboard.name)]}
              actions={
                getActions(grafanaDashboard.url)
              }
            />
          ))
        }

        {
          (!projectName || projectName == "") && config?.databases?.map((database) => (
            renderDatabaseDashboardTemplates(database, databaseDashboardTemplates)
          ))
        }
      </List.Section>
    </>;
  };

  const renderDatabases = (projectName: string, databases: Database[] | undefined) => {
    return <List.Section title="Databases" key={`database-${projectName}`}>
      {
        databases?.map((database, index) => (
          <List.Item
            key={`database-${index}-${projectName}-${database.id}`}
            title={database.name}
            subtitle={`${database.url} - ${database.clusterName}`}
            icon={Icon.Document}
            keywords={["database", "db", ...generateSearchKeywords(projectName), ...generateSearchKeywords(database.name), ...generateSearchKeywords(database.fullClusterName)]}
            actions={
              getActions(database.url)
            }
          />
        ))
      }
    </List.Section>;
  };

  const renderCustomLinks = (projectName: string, customLinks: CustomLink[] | undefined) => {
    if (!customLinks || customLinks.length === 0) return null;

    return <List.Section title="Custom Links" key={`customLink-${projectName}`}>
      {
        customLinks?.map((customLink, index) => (
          <List.Item
            key={`customLink-${index}-${projectName}-${customLink.name}`}
            title={customLink.name}
            subtitle={customLink.url}
            icon={Icon.Bookmark}
            keywords={["customLink", ...generateSearchKeywords(projectName), ...generateSearchKeywords(customLink.name)]}
            actions={
              getActions(customLink.url)
            }
          />
        ))
      }
    </List.Section>;
  };

  const renderProjectTemplates = (project: Project, templates: TemplateUrl[] | undefined) => {
    if (!templates || templates.length === 0) return null;

    return <List.Section title="Generated From Template" key={`project-template-${project.name}`}>
      {
        templates.map((template, index) => {
            const generatedUrl = template.templateUrl.replaceAll(APP_NAME_PLACEHOLDER, project.name);

            return (
              <List.Item
                key={`customLink-${index}-${project.name}-${template.name}`}
                title={template.name}
                subtitle={generatedUrl}
                icon={Icon.Bookmark}
                keywords={["template", ...generateSearchKeywords(project.name), ...generateSearchKeywords(template.name)]}
                actions={
                  <ActionPanel>
                    <Action title="Open"
                            onAction={() => handleOpenLink(generatedUrl)} />
                  </ActionPanel>
                }
              />
            );
          }
        )
      }
    </List.Section>;
  };

  const renderDatabaseDashboardTemplates = (database: Database, templates: TemplateUrl[] | undefined) => {
    if (!templates || templates.length === 0) return null;

    return templates.map((template, index) => {
        return (
          <List.Item
            key={`databaseDashboardTemplate-${index}-${database.id}-${template.name}`}
            title={`${database.name}`}
            subtitle={template.name}
            icon={Icon.PieChart}
            keywords={["template", "database", "dashboard", ...generateSearchKeywords(database.name), ...generateSearchKeywords(template.name)]}
            actions={
              getActions(template.templateUrl
                .replaceAll(DC_PLACEHOLDER, database.dc)
                .replaceAll(DB_CLUSTER_NAME_PLACEHOLDER, database.clusterName))}
          />
        );
      }
    );
  };

  const renderConfig = () => {
    if (!ready) return;

    return (
      <>
        {renderProjects()}
        {renderCustomLinks("", config?.customLinks)}
        {renderDatabases("", config?.databases)}
        {renderDashboards("", config?.grafanaDashboards)}
      </>
    );
  };

  if (!ready) {
    return <Detail markdown="error loading configuration" />;
  } else {
    return (
      <List>
        {renderConfig()}
      </List>
    );
  }
}
