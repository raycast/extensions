import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { REGISTRY_URL, agentDefinitionUrl, agentPageUrl, fetchAgents, installCommand, type Agent } from "./registry";
import { RunAgent } from "./run-agent";

function AgentActions({ agent }: { agent: Agent }) {
  return (
    <ActionPanel>
      {agent.runnable ? <Action.Push title="Run Agent" target={<RunAgent agent={agent} />} icon={Icon.Play} /> : null}
      {agent.installable ? (
        <Action.CopyToClipboard title="Copy Install Command" content={installCommand(agent)} icon={Icon.Terminal} />
      ) : (
        <Action.CopyToClipboard title="Copy Agent ID" content={agent.id} icon={Icon.Clipboard} />
      )}
      <Action.OpenInBrowser title="Open Agent Page" url={agentPageUrl(agent)} icon={Icon.Globe} />
      <ActionPanel.Section>
        {agent.installable ? (
          <Action.CopyToClipboard title="Copy Agent ID" content={agent.id} icon={Icon.Clipboard} />
        ) : null}
        <Action.OpenInBrowser title="Open JSON Definition" url={agentDefinitionUrl(agent)} icon={Icon.Code} />
        <Action.OpenInBrowser title="Open AgentsKit Registry" url={REGISTRY_URL} icon={Icon.Link} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function AgentDetail({ agent }: { agent: Agent }) {
  return (
    <List.Item.Detail
      markdown={agent.description}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Agent ID" text={agent.id} />
          <List.Item.Detail.Metadata.Label title="Category" text={agent.category} />
          {agent.version ? <List.Item.Detail.Metadata.Label title="Version" text={agent.version} /> : null}
          {agent.status ? <List.Item.Detail.Metadata.Label title="Status" text={agent.status} /> : null}
          <List.Item.Detail.Metadata.Label title="Runnable" text={agent.runnable ? "Yes" : "No"} />
          {agent.runnable ? <List.Item.Detail.Metadata.Label title="Execution Mode" text="Portable Runtime" /> : null}
          {agent.validation?.status ? (
            <List.Item.Detail.Metadata.Label
              title="Validation"
              text={
                agent.validation.score === undefined
                  ? agent.validation.status
                  : `${agent.validation.status} (${agent.validation.score})`
              }
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            />
          ) : null}
          {agent.source ? <List.Item.Detail.Metadata.Label title="Source" text={agent.source} /> : null}
          {agent.license ? <List.Item.Detail.Metadata.Label title="License" text={agent.license} /> : null}
          {agent.packages.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Packages">
              {agent.packages.map((packageName) => (
                <List.Item.Detail.Metadata.TagList.Item key={packageName} text={packageName} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {agent.tags.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {agent.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Link title="Agent Page" text="Open in browser" target={agentPageUrl(agent)} />
          <List.Item.Detail.Metadata.Link
            title="Definition"
            text="View public JSON"
            target={agentDefinitionUrl(agent)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [category, setCategory] = useState("all");
  const { data: agents = [], isLoading, error, revalidate } = useCachedPromise(fetchAgents, []);

  const categories = useMemo(
    () => [...new Set(agents.map((agent) => agent.category))].sort((left, right) => left.localeCompare(right)),
    [agents],
  );

  const visibleAgents = useMemo(
    () => (category === "all" ? agents : agents.filter((agent) => agent.category === category)),
    [agents, category],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search by name, ID, package, or tag"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" value={category} onChange={setCategory}>
          <List.Dropdown.Item title="All Categories" value="all" />
          {categories.map((item) => (
            <List.Dropdown.Item key={item} title={item} value={item} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load the Registry"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Registry in Browser" url={REGISTRY_URL} />
            </ActionPanel>
          }
        />
      ) : (
        visibleAgents.map((agent) => (
          <List.Item
            key={agent.id}
            icon={agent.runnable ? Icon.Play : Icon.Box}
            title={agent.title}
            subtitle={agent.id}
            keywords={[agent.category, ...agent.tags, ...agent.packages]}
            accessories={[
              { tag: { value: agent.category, color: Color.Blue } },
              ...(agent.runnable ? [{ icon: Icon.Play }] : []),
              ...(agent.installable ? [{ icon: Icon.Download }] : []),
            ]}
            detail={<AgentDetail agent={agent} />}
            actions={<AgentActions agent={agent} />}
          />
        ))
      )}
    </List>
  );
}
