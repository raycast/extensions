import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { useEffect, useState } from "react";

import Service from "./service";
import { Plugin } from "./service";
import { getFunctions, ZshAlias, ZshFunction } from "./utils";

const MARKDOWN_CODE_BLOCK = "```";

import { getAliases, getSectionsFromMarkdown, checkTableReMatch } from "./utils";

function Command() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlugins() {
      const plugins = await Service.listPlugins();
      setPlugins(plugins);
      setLoading(false);
    }
    fetchPlugins();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search plugins">
      {plugins.map((plugin) => (
        <List.Item
          key={plugin.name}
          title={plugin.name}
          actions={
            <ActionPanel>
              <Action.Push title={`Show Details`} target={<PluginDetailPlus plugin={plugin} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface PluginDetailProps {
  plugin: Plugin;
}

function PluginDetailPlus({ plugin }: PluginDetailProps) {
  const [readme, setReadme] = useState("");
  const [isDetailLoading, setDetailLoading] = useState(true);
  const [isListLoading, setListLoading] = useState(true);
  const [tableFound, setTableFound] = useState(false);

  useEffect(() => {
    async function fetchREADME() {
      const readme = await Service.getReadme(plugin);
      setReadme(readme);
      const readmeString = readme.toString();
      const tableRe = /\|.*\|/g;
      if (checkTableReMatch(readmeString.match(tableRe))) {
        setTableFound(true);
      }
      setListLoading(false);
      setDetailLoading(false);
    }
    fetchREADME();
  }, [plugin]);

  const listCommands = ["Summary", "Aliases", "Functions"];

  const sectionsFromMarkdown = getSectionsFromMarkdown(readme);

  if (!tableFound) {
    return (
      <Detail
        navigationTitle={`${plugin.name} plugin`}
        isLoading={isDetailLoading}
        markdown={readme}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={`${plugin.html_url}#readme`} />
          </ActionPanel>
        }
      />
    );
  } else {
    return (
      <List navigationTitle={`${plugin.name} plugin`} isLoading={isListLoading}>
        {listCommands.map((command, index) => (
          <List.Item
            key={index}
            title={command}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Show ${command}`}
                  target={<ListCommand plugin={plugin} command={command} summary={sectionsFromMarkdown[0].content} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
}

interface ListCommandProps {
  plugin: Plugin;
  command: string;
  summary: string | null;
}

function ListCommand({ plugin, command, summary }: ListCommandProps) {
  const [isAliasesLoading, setAliasesLoading] = useState(true);
  const [isFunctionsLoading, setFunctionsLoading] = useState(true);

  const [aliases, setAliases] = useState<ZshAlias[]>([]);
  const [functions, setFunctions] = useState<ZshFunction[]>([]);

  useEffect(() => {
    async function fetchZsh() {
      setAliases(getAliases(await Service.getZsh(plugin)));
      setFunctions(getFunctions(await Service.getZsh(plugin)));
      setAliasesLoading(false);
      setFunctionsLoading(false);
    }
    fetchZsh();
  }, [plugin]);

  switch (command) {
    case "Summary": {
      return (
        <Detail
          markdown={summary}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${plugin.html_url}#readme`} />
            </ActionPanel>
          }
        />
      );
    }
    case "Aliases": {
      return (
        <List
          navigationTitle={`${plugin.name} aliases`}
          isLoading={isAliasesLoading}
          searchBarPlaceholder="Search aliases or commands"
        >
          {aliases.map((alias, index) => (
            <List.Item
              key={index}
              title={alias.command}
              subtitle={alias.alias}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title={`Copy Alias`}
                    content={alias.alias}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List>
      );
    }
    case "Functions": {
      return (
        <List
          navigationTitle={`${plugin.name} functions`}
          isLoading={isFunctionsLoading}
          searchBarPlaceholder="Search functions"
        >
          {functions.map((func, index) => (
            <List.Item
              key={index}
              title={func.name}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={`Show Function`}
                    target={<Detail markdown={`${MARKDOWN_CODE_BLOCK}\n${func.body}\n${MARKDOWN_CODE_BLOCK}`} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List>
      );
    }
    default: {
      return <Detail markdown={"No command found"} />;
    }
  }
}

export default Command;
