import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";

import { Instance } from "./types";
import useInstances from "./hooks/useInstances";
import { findReferences } from "./utils/snSnippets";
import { ServiceNowClient } from "./utils/serviceNowClient";
import { buildServiceNowUrl } from "./utils/buildServiceNowUrl";

type Reference = {
  table: string;
  column: string;
  count: number;
  operator: string;
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export default function FindReferences(props: LaunchProps) {
  const { table, sysId, instanceName } = props.arguments;
  const { instances, selectedInstance, setSelectedInstance, isLoading: isLoadingInstances } = useInstances();
  const [references, setReferences] = useState<Reference[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorFetching, setErrorFetching] = useState(false);

  useEffect(() => {
    if (isLoadingInstances) return;
    if (instances.length === 0) {
      showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
      popToRoot();
      return;
    }
    if (instanceName) {
      const found = instances.find(
        (i: Instance) =>
          i.name.toLowerCase().includes(instanceName.toLowerCase()) ||
          i.alias?.toLowerCase().includes(instanceName.toLowerCase()),
      );
      if (found && found.id !== selectedInstance?.id) {
        setSelectedInstance(found);
        LocalStorage.setItem("selected-instance", JSON.stringify(found));
      } else if (!found) {
        showToast(
          Toast.Style.Failure,
          "Instance not found",
          `No instance profile found with name or alias: ${instanceName}`,
        );
      }
    }
  }, [isLoadingInstances]);

  useEffect(() => {
    if (!selectedInstance) return;
    let cancelled = false;
    setIsLoading(true);
    setErrorFetching(false);
    setReferences(null);

    (async () => {
      const client = new ServiceNowClient(selectedInstance);
      const authed = await client.init();
      if (cancelled) return;
      if (!authed) {
        setErrorFetching(true);
        setIsLoading(false);
        return;
      }
      await client.startBackgroundScript(findReferences(table, sysId), (response) => {
        if (cancelled) return;
        const match = response.match(/###([\s\S]*?)###/);
        if (!match || !match[1]) {
          showToast(Toast.Style.Failure, "Could not search references", "Are you an admin? Check the table name.");
          setErrorFetching(true);
          setIsLoading(false);
          return;
        }
        try {
          const parsed = JSON.parse(decodeHtmlEntities(match[1])) as Reference[];
          setReferences(parsed);
          setIsLoading(false);
        } catch (err) {
          showToast(Toast.Style.Failure, "Could not parse references", String(err));
          setErrorFetching(true);
          setIsLoading(false);
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedInstance?.id, table, sysId]);

  const onInstanceChange = (newValue: string) => {
    const aux = instances.find((i) => i.id === newValue);
    if (aux) {
      setSelectedInstance(aux);
      LocalStorage.setItem("selected-instance", JSON.stringify(aux));
    }
  };

  const instanceId = selectedInstance?.id ?? "";

  return (
    <List
      isLoading={isLoading || isLoadingInstances}
      navigationTitle="Find Record References"
      searchBarPlaceholder="Filter by table, column..."
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoadingInstances}
          value={instanceId}
          tooltip="Select the instance to search in"
          onChange={(newValue) => {
            if (!isLoadingInstances) onInstanceChange(newValue);
          }}
        >
          <List.Dropdown.Section title="Instance Profiles">
            {instances.map((instance: Instance) => (
              <List.Dropdown.Item
                key={instance.id}
                title={instance.alias ? instance.alias : instance.name}
                value={instance.id}
                icon={{
                  source: instanceId == instance.id ? Icon.CheckCircle : Icon.Circle,
                  tintColor: instance.color,
                }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {errorFetching ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could Not Fetch References"
          description="Check that you are an admin on this instance and that the table name is correct."
        />
      ) : references && references.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No References Found"
          description={`No table references the ${table} record with sys_id ${sysId}.`}
        />
      ) : (
        references?.map((ref, idx) => {
          const url = buildServiceNowUrl(
            selectedInstance?.name ?? "",
            `${ref.table}_list.do?sysparm_query=${ref.column}${ref.operator}${sysId}`,
          );
          return (
            <List.Item
              key={`${ref.table}.${ref.column}.${idx}`}
              title={ref.table}
              subtitle={ref.column}
              keywords={[ref.table, ref.column]}
              accessories={[{ text: `${ref.count} record${ref.count === 1 ? "" : "s"}` }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={`${ref.table}.${ref.column}`}>
                    <Action.OpenInBrowser title="Open in ServiceNow" url={url} icon={{ source: "servicenow.svg" }} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={url}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
