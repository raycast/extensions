import { List, Action, ActionPanel, Icon, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences } from "../utils/types";
import { Icons, getIsCodeFile } from "../utils/utils";
import { api as getApi } from "../api";
import open from "open"

export const Modules = (props: { id: any; url: string }) => {
  const preferences: Preferences = getPreferenceValues();
  const api = getApi(preferences.token, preferences.domain);

  const [modules, setModules]: any = useState();
  const [isLoading, setIsLoading]: any = useState(true);

  useEffect(() => {
    api.courses[props.id].modules["?include=items"]
      .get()
      .then((json: any) => {
        const modules = json.map((module: any) => {
          const items = module.items
            .filter((item: any) => item.type !== "SubHeader")
            .map((item: any) => ({
              id: item.content_id,
              name: item.title
                .replace(/\s\(.*/g, "")
                .replace(/\s?:.*/g, "")
                .replace(/PM/g, "pm"),
              passcode: item.title.match(/Passcode: \S{9,10}/g)?.[0].substring(10),
              type: item.type,
              url: item.html_url,
            }));

          return {
            name: module.name,
            id: module.id,
            url: module.url,
            items: items,
          };
        });
        const promises = [];
        modules.map((module) => {
          module.items
            .filter((item) => item.type === "File")
            .map((item) => {
              promises.push(
                api.courses[props.id].files[item.id].get().then((json: any) => {
                  return json.url;
                })
              );
            });
        });
        Promise.all(promises).then((urls: any) => {
          let i = 0;
          modules.map((module) => {
            module.items.map((item) => {
              if (item.type === "File") {
                item.download = urls[i];
                i++;
              }
            });
          });
          setModules(modules);
          setIsLoading(false);
        });
      })
      .catch((err: any) => {
        showToast(Toast.Style.Failure, `Error: ${err.message}`);
      });
  }, []);

  return (
    <List isLoading={isLoading}>
      {modules?.map((module: any, index: number) => (
        <List.Section title={module.name} key={index}>
          {module.items?.map((element: any, key: number) => (
            <List.Item
              title={element.name}
              key={key}
              icon={{
                source: getIsCodeFile(element.name)
                  ? Icons["Code"]
                  : element.passcode
                  ? Icons["Passcode"]
                  : element.type in Icons
                  ? Icons[element.type]
                  : Icon.ExclamationMark,
              }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Browser" url={element.url} icon={{ source: Icon.Link }} />
                  {element.download && (
                    <Action
                      title="Download File"
                      onAction={async () => await open(element.download, { background: true })}
                      icon={{ source: Icon.Download }}
                    />
                  )}
                  {element.passcode && <Action.CopyToClipboard title="Copy Passcode" content={element.passcode} />}
                  {element.passcode && (
                    <Action.Paste
                      title="Paste Passcode"
                      content={element.passcode}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && (modules?.length === 0 || modules[0].items?.length === 0) && (
        <List.Item
          title="Open Home Page"
          icon={{ source: Icon.Link }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={props.url} icon={{ source: Icon.Link }} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};
