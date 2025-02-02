import { Action, ActionPanel, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast, useExec, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { setTimeout } from "node:timers/promises";

type HelmRepo = {
  name: string;
  url: string;
};

type HelmChart = {
  name: string;
  version: string;
  description: string;
};

type HelmChartVersion = {
  name: string;
  version: string;
  app_version: string;
  description: string;
};

export default function Command() {
  return <Repos />;
}

function Repos() {
  const { push } = useNavigation();
  const { isLoading, data } = useExec("helm", ["repo", "list", "--output", "json"]);

  const repos = useMemo<HelmRepo[]>(() => {
    try {
      return JSON.parse(data || "[]");
    } catch (error) {
      showFailureToast(error, { title: "Could not fetch helm repos" });
      return [];
    }
  }, [data]);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Local" subtitle="Cached Repositories">
        {repos.map((repo) => (
          <List.Item
            key={repo.name}
            title={repo.name}
            subtitle={repo.url}
            actions={
              <ActionPanel>
                <Action title="Show Charts" onAction={() => push(<Repo name={repo.name} url={repo.url} />)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function Repo({ name }: HelmRepo) {
  const { push } = useNavigation();
  const { isLoading, data } = useExec("helm", ["search", "repo", `${name}/`, "--output", "json"]);

  const charts = useMemo<HelmChart[]>(() => {
    try {
      return JSON.parse(data || "[]");
    } catch (error) {
      showFailureToast(error, { title: "Could not fetch helm charts" });
      return [];
    }
  }, [data]);

  return (
    <List isLoading={isLoading}>
      <List.Section title={name} subtitle="Available Charts">
        {charts.map((chart) => (
          <List.Item
            key={chart.name}
            title={chart.name}
            subtitle={chart.version}
            accessories={[{ text: chart.description }]}
            actions={
              <ActionPanel>
                <Action title="Show Versions" onAction={() => push(<ChartVersions chart={chart.name} />)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ChartVersions({ chart }: { chart: string }) {
  const PAGE_SIZE = 50;
  const [searchText, setSearchText] = useState("");

  const { data } = useExec("helm", ["search", "repo", "-r", `\\v${chart}\\v`, "--versions", "--output", "json"]);

  const allVersions = useMemo<HelmChartVersion[]>(() => {
    try {
      return JSON.parse(data || "[]");
    } catch (error) {
      showFailureToast(error, { title: "Could not fetch chart versions" });
      return [];
    }
  }, [data]);

  const {
    isLoading,
    data: versions,
    pagination,
  } = usePromise(
    (searchText: string) => async (options: { page: number }) => {
      await setTimeout(250);
      const filteredVersions = allVersions.filter((version) =>
        version.version.toLowerCase().startsWith(searchText.toLowerCase()),
      );
      const start = options.page * PAGE_SIZE;
      const newData = filteredVersions.slice(start, start + PAGE_SIZE);
      return { data: newData, hasMore: options.page < filteredVersions.length / PAGE_SIZE - 1 };
    },
    [searchText],
  );

  const [selectedValues, setSelectedValues] = useState<string>("");

  return (
    <List isLoading={isLoading} isShowingDetail pagination={pagination} onSearchTextChange={setSearchText}>
      <List.Section title={chart} subtitle="Available Versions">
        {versions?.map((version) => (
          <List.Item
            key={`${version.name}-${version.version}`}
            title={version.version}
            subtitle={version.app_version}
            accessories={[{ text: `App: ${version.description}` }]}
            detail={<ChartValues chart={version.name} version={version.version} onValuesLoaded={setSelectedValues} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Values" content={selectedValues} />
                <Action.CopyToClipboard
                  title="Copy Show Values Command"
                  content={`helm show values ${chart} --version ${version.version}`}
                />
                <Action.CopyToClipboard
                  title="Copy Install Command"
                  content={`helm install ${chart.split("/")[1]} ${chart}`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ChartValues({
  chart,
  version,
  onValuesLoaded,
}: {
  chart: string;
  version: string;
  onValuesLoaded: (values: string) => void;
}) {
  const { isLoading, data } = useExec("helm", ["show", "values", chart, "--version", version]);
  const MAX_LINES = 250;

  if (!isLoading && !data) {
    showToast({
      style: Toast.Style.Failure,
      title: "No values",
    });
  }

  const truncatedData = useMemo(() => {
    if (!data) {
      return "";
    }
    const lines = data.split("\n");
    if (lines.length > MAX_LINES) {
      return lines.slice(0, MAX_LINES).join("\n");
    }
    return data;
  }, [data]);

  const isTruncated = data && data.split("\n").length > MAX_LINES;

  useEffect(() => {
    if (data) {
      onValuesLoaded(data);
    }
  }, [data, onValuesLoaded]);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={`
${
  truncatedData
    ? `
\`\`\`yaml
${truncatedData}
\`\`\`
${
  isTruncated
    ? `
> ⚠️ Values file truncated - showing first ${MAX_LINES} lines`
    : ""
}`
    : ""
}`}
    />
  );
}
