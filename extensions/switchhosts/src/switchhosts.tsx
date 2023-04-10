import { List, Detail, render, Icon, Color, ActionPanel, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import React, { useState, useEffect } from "react";

interface switchHostsList {
  success: boolean;
  data: Array<switchHosts>;
}

interface switchHosts {
  title: string;
  id: string;
  on: boolean;
}

function getSwitchHostsList() {
  return fetch("http://127.0.0.1:50761/api/list", { method: "GET" });
}

function switchHost(id: string) {
  return fetch(`http://127.0.0.1:50761/api/toggle?id=${id}`, { method: "GET" });
}

function SwitchHostsList() {
  const [switchHostsList, setSwitchHostsList] = useState<switchHostsList>({ success: false, data: [] });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const result = await getSwitchHostsList();
        setSwitchHostsList(await result.json());
      } catch (e) {
        setSwitchHostsList({ success: false, data: [] });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (!switchHostsList.success && !isLoading) {
    const errorMsg = `## An error occurred  
  * Please check the application <SwitchHosts> is installed
  * Please check the port(50761) is opened in the application <SwitchHosts>`;
    return <Detail markdown={errorMsg} isLoading={isLoading} />;
  } else {
    return (
      <List isLoading={isLoading}>
        {switchHostsList.data.map((item: switchHosts, index: number) => (
          <List.Item
            key={index}
            title={item.title}
            icon={{
              source: item.on ? Icon.Checkmark : Icon.Circle,
              tintColor: item.on ? Color.Green : Color.Blue,
            }}
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  title={item.on ? "Close" : "Open"}
                  onAction={async () => {
                    const res = await switchHost(item.id);
                    const isSwitchSuccess = await res.text();
                    if (isSwitchSuccess === "ok") {
                      setTimeout(async function () {
                        const result = await getSwitchHostsList();
                        setSwitchHostsList(await result.json());
                        await showToast(
                          ToastStyle.Success,
                          "Success",
                          `${item.on ? "Close" : "Open"} Host ${item.title} Success`
                        );
                      }, 300);
                    } else {
                      await showToast(
                        ToastStyle.Failure,
                        "Failed",
                        `${item.on ? "Close" : "Open"} Host ${item.title} Failed`
                      );
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
}

render(<SwitchHostsList />);
