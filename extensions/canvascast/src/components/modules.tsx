import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { HomePage } from "./home-page";
import { getModules } from "../api";
import { modulesection, moduleitem } from "../utils/types";
import { Icons, getIsCodeFile } from "../utils/utils";
import open from "open";

export const Modules = (props: { id: number; url: string }) => {
  const [modules, setModules] = useState<modulesection[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getItems = async () => {
      try {
        const modules = await getModules(props.id);
        setModules(modules);
        setIsLoading(false);
      } catch {
        setModules(null);
        setIsLoading(false);
      }
    };
    getItems();
  }, []);

  return (
    <List isLoading={isLoading}>
      {modules !== null ? (
        modules?.map((module: modulesection, index: number) => (
          <List.Section title={module.name} key={index}>
            {module.items?.map((item: moduleitem, index: number) => (
              <List.Item
                title={item.name}
                key={index}
                icon={{
                  source: getIsCodeFile(item.name)
                    ? Icons["Code"]
                    : item.passcode
                    ? Icons["Passcode"]
                    : item.type in Icons
                    ? Icons[item.type]
                    : Icon.ExclamationMark,
                }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={item.url} icon={{ source: Icon.Link }} />
                    {item.download && (
                      <Action
                        title="Download File"
                        onAction={async () => await open(item.download, { background: true })}
                        icon={{ source: Icon.Download }}
                      />
                    )}
                    {item.passcode && (
                      <ActionPanel.Section title="Passcode">
                        <Action.CopyToClipboard title="Copy Passcode" content={item.passcode} />
                        <Action.Paste
                          title="Paste Passcode"
                          content={item.passcode}
                          shortcut={{ modifiers: ["cmd"], key: "p" }}
                        />
                      </ActionPanel.Section>
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      ) : (
        <HomePage url={props.url} description={"Error fetching the course modules."} />
      )}
      {!isLoading && (modules?.length === 0 || modules[0].items?.length === 0) && (
        <HomePage url={props.url} description={"This course does not have any modules."} />
      )}
    </List>
  );
};
