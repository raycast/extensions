import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Form,
  getSelectedText,
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
import { getURL } from "./utils/browserScripts";
import { getInstanceBaseUrl, isServiceNowUrl } from "./utils/instanceUrl";
import { extractRecordFromUrl } from "./utils/extractRecordFromUrl";

type Reference = {
  table: string;
  column: string;
  count: number;
  operator: string;
};

type Target = { table: string; sysId: string };
type TargetSource = "args" | "tab" | "selection" | "form";

function sourceSuffix(source: TargetSource | null): string {
  if (source === "tab") return " — from browser tab";
  if (source === "selection") return " — from selection";
  return "";
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export default function FindReferences(props: LaunchProps) {
  const { table: argTable, sysId: argSysId, instanceName } = props.arguments;
  const { instances, selectedInstance, setSelectedInstance, isLoading: isLoadingInstances } = useInstances();
  const hasAnyArg = !!(argTable || argSysId || instanceName);
  const initialTarget: Target | null = argTable && argSysId ? { table: argTable, sysId: argSysId } : null;
  const [target, setTarget] = useState<Target | null>(initialTarget);
  const [targetSource, setTargetSource] = useState<TargetSource | null>(initialTarget ? "args" : null);
  const [detectionDone, setDetectionDone] = useState<boolean>(initialTarget !== null || hasAnyArg);
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
          `No instance found with URL or alias containing ${instanceName}`,
        );
      }
    }
  }, [isLoadingInstances]);

  useEffect(() => {
    if (isLoadingInstances || detectionDone || target || instances.length === 0 || hasAnyArg) return;
    let cancelled = false;
    (async () => {
      try {
        let url: string | undefined;
        let parsed: { table: string; sysId: string } | null = null;
        let source: TargetSource | null = null;

        const tabUrl = await getURL();
        if (cancelled) return;
        if (tabUrl && isServiceNowUrl(tabUrl, instances)) {
          parsed = extractRecordFromUrl(tabUrl);
          if (parsed) {
            url = tabUrl;
            source = "tab";
          }
        }

        if (!parsed) {
          try {
            const selection = (await getSelectedText())?.trim();
            if (cancelled) return;
            if (selection && isServiceNowUrl(selection, instances)) {
              parsed = extractRecordFromUrl(selection);
              if (parsed) {
                url = selection;
                source = "selection";
              }
            }
          } catch {
            // ignore selection errors (no selection / no permission)
          }
        }

        if (!parsed || !url) {
          setDetectionDone(true);
          return;
        }

        try {
          const hostname = new URL(url).hostname.toLowerCase();
          const matched = instances.find((i) => {
            try {
              return new URL(getInstanceBaseUrl(i)).hostname.toLowerCase() === hostname;
            } catch {
              return false;
            }
          });
          if (matched && matched.id !== selectedInstance?.id) {
            setSelectedInstance(matched);
            LocalStorage.setItem("selected-instance", JSON.stringify(matched));
          }
        } catch {
          // ignore hostname errors
        }
        setTarget(parsed);
        setTargetSource(source);
        setDetectionDone(true);
      } catch {
        if (!cancelled) setDetectionDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoadingInstances]);

  useEffect(() => {
    if (!selectedInstance || !target) return;
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
      await client.startBackgroundScript(findReferences(target.table, target.sysId), (response) => {
        if (cancelled) return;
        const match = response.match(/###([\s\S]*?)###/);
        if (!match || !match[1]) {
          showToast(
            Toast.Style.Failure,
            "Could not search references",
            "Check that you are an admin and the table name is correct.",
          );
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
  }, [selectedInstance?.id, target?.table, target?.sysId]);

  const onInstanceChange = (newValue: string) => {
    const aux = instances.find((i) => i.id === newValue);
    if (aux) {
      setSelectedInstance(aux);
      LocalStorage.setItem("selected-instance", JSON.stringify(aux));
    }
  };

  const instanceId = selectedInstance?.id ?? "";

  if (!target && !detectionDone) {
    return <List isLoading navigationTitle={`Find Record References${sourceSuffix(targetSource)}`} />;
  }

  if (!target) {
    return (
      <Form
        navigationTitle={`Find Record References${sourceSuffix(targetSource)}`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Find References"
              icon={Icon.MagnifyingGlass}
              onSubmit={(values: { table?: string; sysId?: string }) => {
                const t = values.table?.trim();
                const s = values.sysId?.trim();
                if (!t || !s) {
                  showToast(Toast.Style.Failure, "Missing fields", "Please enter both a table and a sys_id");
                  return;
                }
                setTarget({ table: t, sysId: s });
                setTargetSource("form");
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="Could not detect a ServiceNow record from your browser tab or selection. Enter the table and Sys ID to search." />
        <Form.TextField id="table" title="Table" placeholder="e.g. sys_user" defaultValue={argTable} />
        <Form.TextField id="sysId" title="Sys ID" placeholder="32-character sys_id" defaultValue={argSysId} />
        <Form.Dropdown
          id="instance"
          title="Instance"
          value={instanceId}
          onChange={onInstanceChange}
          isLoading={isLoadingInstances}
        >
          {instances.map((instance: Instance) => (
            <Form.Dropdown.Item
              key={instance.id}
              title={instance.alias ? instance.alias : instance.name}
              value={instance.id}
              icon={{
                source: instanceId == instance.id ? Icon.CheckCircle : Icon.Circle,
                tintColor: instance.color,
              }}
            />
          ))}
        </Form.Dropdown>
      </Form>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingInstances}
      navigationTitle={`Find Record References${sourceSuffix(targetSource)}`}
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
          description={`No table references the ${target.table} record with Sys ID ${target.sysId}.`}
        />
      ) : (
        references?.map((ref, idx) => {
          const url = buildServiceNowUrl(
            selectedInstance?.name ?? "",
            `${ref.table}_list.do?sysparm_query=${ref.column}${ref.operator}${target.sysId}`,
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
