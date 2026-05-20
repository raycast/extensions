import { useEffect, useRef, useState } from "react";
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

import Actions from "./components/Actions";
import TableRecords from "./components/TableRecords";
import { Instance } from "./types";
import useInstances from "./hooks/useInstances";
import { findReferences } from "./utils/snSnippets";
import { ServiceNowClient } from "./utils/serviceNowClient";
import { buildServiceNowUrl } from "./utils/buildServiceNowUrl";
import { getURL } from "./utils/browserScripts";
import { getInstanceBaseUrl, isServiceNowUrl } from "./utils/instanceUrl";
import { instanceLabel } from "./utils/instanceLabel";
import { extractRecordFromUrl, SYS_ID_RE, TABLE_NAME_RE } from "./utils/extractRecordFromUrl";
import { expandKeywords } from "./utils/expandKeywords";
import { matchInstance, notFoundToast, NO_PROFILES_TOAST } from "./utils/instanceResolver";

const INVALID_TARGET_TOAST = {
  style: Toast.Style.Failure,
  title: "Invalid input",
  message: "Table must contain only letters, digits, or underscores; Sys ID must be 32 hex characters.",
} as const;

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
  const argTableTrimmed = argTable?.trim() || null;
  const argSysIdTrimmed = argSysId?.trim() || null;
  const argTableValid = argTableTrimmed !== null && TABLE_NAME_RE.test(argTableTrimmed);
  const argSysIdValid = argSysIdTrimmed !== null && SYS_ID_RE.test(argSysIdTrimmed);
  const initialTarget: Target | null =
    argTableValid && argSysIdValid ? { table: argTableTrimmed!, sysId: argSysIdTrimmed! } : null;
  const argsInvalid = (argTableTrimmed !== null && !argTableValid) || (argSysIdTrimmed !== null && !argSysIdValid);
  const [target, setTarget] = useState<Target | null>(initialTarget);
  const [targetSource, setTargetSource] = useState<TargetSource | null>(initialTarget ? "args" : null);
  const [detectionDone, setDetectionDone] = useState<boolean>(initialTarget !== null || hasAnyArg);
  const [references, setReferences] = useState<Reference[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorFetching, setErrorFetching] = useState(false);
  const detectionStarted = useRef(false);

  useEffect(() => {
    if (argsInvalid) showToast(INVALID_TARGET_TOAST);
  }, []);

  useEffect(() => {
    if (isLoadingInstances) return;
    if (instances.length === 0) {
      showToast(NO_PROFILES_TOAST);
      popToRoot();
      return;
    }
    if (instanceName) {
      const found = matchInstance(instances, instanceName);
      if (found && found.id !== selectedInstance?.id) {
        setSelectedInstance(found);
        LocalStorage.setItem("selected-instance", JSON.stringify(found));
      } else if (!found) {
        showToast(notFoundToast(instanceName));
      }
    }
  }, [isLoadingInstances]);

  useEffect(() => {
    if (isLoadingInstances || detectionDone || target || instances.length === 0 || hasAnyArg) return;
    if (detectionStarted.current) return;
    detectionStarted.current = true;
    (async () => {
      try {
        let url: string | undefined;
        let parsed: { table: string; sysId: string } | null = null;
        let source: TargetSource | null = null;

        const tabUrl = await getURL();
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
        setDetectionDone(true);
      }
    })();
  }, [isLoadingInstances]);

  useEffect(() => {
    if (!selectedInstance || !target) return;
    let cancelled = false;
    setIsLoading(true);
    setErrorFetching(false);
    setReferences(null);

    (async () => {
      const client = new ServiceNowClient(selectedInstance, (updated) => {
        if (selectedInstance.id === updated.id) setSelectedInstance(updated);
      });
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
          showToast({
            style: Toast.Style.Failure,
            title: "Could Not Search References",
            message: "Check that you are an admin and the table name is correct.",
          });
          setErrorFetching(true);
          setIsLoading(false);
          return;
        }
        try {
          const parsed = JSON.parse(decodeHtmlEntities(match[1])) as Reference[];
          setReferences(parsed);
          setIsLoading(false);
        } catch (err) {
          showToast({ style: Toast.Style.Failure, title: "Could Not Parse References", message: String(err) });
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
    const found = instances.find((i) => i.id === newValue);
    if (found) {
      setSelectedInstance(found);
      LocalStorage.setItem("selected-instance", JSON.stringify(found));
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
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Missing fields",
                    message: "Please enter both a table and a sys_id",
                  });
                  return;
                }
                if (!TABLE_NAME_RE.test(t) || !SYS_ID_RE.test(s)) {
                  showToast(INVALID_TARGET_TOAST);
                  return;
                }
                setTarget({ table: t, sysId: s });
                setTargetSource("form");
              }}
            />
            <Actions />
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
              title={instanceLabel(instance)}
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
                title={instanceLabel(instance)}
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
              keywords={expandKeywords(ref.table, ref.column)}
              accessories={[
                {
                  icon: Icon.ArrowRightCircle,
                  text: ref.count.toString(),
                  tooltip: `Explore ${ref.count} record${ref.count === 1 ? "" : "s"}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={`${ref.table}.${ref.column}`}>
                    <Action.Push
                      title="Explore Records"
                      icon={Icon.MagnifyingGlass}
                      target={
                        <TableRecords
                          table={{ name: ref.table, label: ref.table, super_class: "" }}
                          extraQuery={`${ref.column}${ref.operator}${target.sysId}`}
                        />
                      }
                    />
                    <Action.OpenInBrowser title="Open in ServiceNow" url={url} icon={{ source: "servicenow.svg" }} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={url}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  </ActionPanel.Section>
                  <Actions />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
