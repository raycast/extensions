import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Form,
  getSelectedText,
  Icon,
  LaunchProps,
  List,
  LocalStorage,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";

import Actions from "./components/Actions";
import { Instance } from "./types";
import useInstances from "./hooks/useInstances";
import { findSysID } from "./utils/snSnippets";
import { ServiceNowClient } from "./utils/serviceNowClient";
import { buildServiceNowUrl } from "./utils/buildServiceNowUrl";
import { instanceLabel } from "./utils/instanceLabel";
import { matchInstance, notFoundToast, NO_PROFILES_TOAST } from "./utils/instanceResolver";
import { SYS_ID_RE } from "./utils/extractRecordFromUrl";

const INVALID_SYS_ID_TOAST = {
  style: Toast.Style.Failure,
  title: "Invalid Sys ID",
  message: "Sys ID must be a 32-character hexadecimal string.",
} as const;

type SysIdSource = "arg" | "selection" | "form";

function sourceSuffix(source: SysIdSource | null): string {
  if (source === "selection") return " — from selection";
  return "";
}

export default function SearchSysId(props: LaunchProps) {
  const { sys_id: argSysId, instanceName } = props.arguments;
  const { instances, selectedInstance, setSelectedInstance, isLoading: isLoadingInstances } = useInstances();
  const argTrimmed = argSysId?.trim() || null;
  const argInitial = argTrimmed && SYS_ID_RE.test(argTrimmed) ? argTrimmed : null;
  const argInvalid = argTrimmed !== null && argInitial === null;
  const [sysId, setSysId] = useState<string | null>(argInitial);
  const [sysIdSource, setSysIdSource] = useState<SysIdSource | null>(argInitial ? "arg" : null);
  const [detectionDone, setDetectionDone] = useState<boolean>(argInitial !== null);

  useEffect(() => {
    if (argInvalid) showToast(INVALID_SYS_ID_TOAST);
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const detectionStarted = useRef(false);

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
    if (detectionStarted.current || detectionDone || sysId) return;
    detectionStarted.current = true;
    (async () => {
      try {
        const selection = (await getSelectedText())?.trim();
        if (selection && SYS_ID_RE.test(selection)) {
          setSysId(selection);
          setSysIdSource("selection");
        }
      } catch {
        // ignore selection errors (no selection / no permission)
      }
      setDetectionDone(true);
    })();
  }, []);

  useEffect(() => {
    if (!selectedInstance || !sysId) return;
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    (async () => {
      const client = new ServiceNowClient(selectedInstance, (updated) => {
        if (selectedInstance.id === updated.id) setSelectedInstance(updated);
      });
      const authed = await client.init();
      if (cancelled) return;
      if (!authed) {
        setErrorMessage("Authentication failed");
        setIsLoading(false);
        return;
      }
      await client.startBackgroundScript(findSysID(sysId), (response) => {
        if (cancelled) return;
        const answer = response.match(/###(.*)###/);
        if (response.length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Could Not Search for Sys ID",
            message: "Admin access is required.",
          });
          setErrorMessage("Admin access is required to run this lookup.");
          setIsLoading(false);
        } else if (answer != null && answer[1]) {
          const table = answer[1].split("^")[0];
          open(buildServiceNowUrl(selectedInstance.name, `${table}.do?sys_id=${sysId}`));
          popToRoot();
        } else {
          const label = instanceLabel(selectedInstance);
          showToast({ style: Toast.Style.Failure, title: `Sys ID not found on ${label}` });
          setErrorMessage(`Sys ID ${sysId} was not found on ${label}.`);
          setIsLoading(false);
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedInstance?.id, sysId]);

  const onInstanceChange = (newValue: string) => {
    const found = instances.find((i) => i.id === newValue);
    if (found) {
      setSelectedInstance(found);
      LocalStorage.setItem("selected-instance", JSON.stringify(found));
    }
  };

  const resetToForm = () => {
    setErrorMessage(null);
    setSysId(null);
    setSysIdSource(null);
  };

  const instanceId = selectedInstance?.id ?? "";

  if (!sysId && !detectionDone) {
    return <List isLoading navigationTitle={`Find Record by Sys ID${sourceSuffix(sysIdSource)}`} />;
  }

  if (!sysId) {
    return (
      <Form
        navigationTitle={`Find Record by Sys ID${sourceSuffix(sysIdSource)}`}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Find Record"
              icon={Icon.MagnifyingGlass}
              onSubmit={(values: { sysId?: string }) => {
                const s = values.sysId?.trim();
                if (!s) {
                  showToast({ style: Toast.Style.Failure, title: "Missing Sys ID", message: "Please enter a Sys ID" });
                  return;
                }
                if (!SYS_ID_RE.test(s)) {
                  showToast(INVALID_SYS_ID_TOAST);
                  return;
                }
                setSysId(s);
                setSysIdSource("form");
              }}
            />
            <Actions />
          </ActionPanel>
        }
      >
        <Form.Description text="Enter the Sys ID of the record you want to open. Highlight a 32-character Sys ID before launching to skip this form." />
        <Form.TextField id="sysId" title="Sys ID" placeholder="32-character sys_id" />
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
      navigationTitle={`Find Record by Sys ID${sourceSuffix(sysIdSource)}`}
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
      {errorMessage ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Lookup Failed"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action title="Try Another Sys ID" icon={Icon.MagnifyingGlass} onAction={resetToForm} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={`Searching for ${sysId}...`} />
      )}
    </List>
  );
}
