import { useEffect, useState } from "react";
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

import { Instance } from "./types";
import useInstances from "./hooks/useInstances";
import { findSysID } from "./utils/snSnippets";
import { ServiceNowClient } from "./utils/serviceNowClient";
import { getInstanceBaseUrl } from "./utils/instanceUrl";

const SYS_ID_RE = /^[0-9a-f]{32}$/i;

type SysIdSource = "arg" | "selection" | "form";

function sourceSuffix(source: SysIdSource | null): string {
  if (source === "selection") return " — from selection";
  return "";
}

export default function SearchSysId(props: LaunchProps) {
  const { sys_id: argSysId, instanceName } = props.arguments;
  const { instances, selectedInstance, setSelectedInstance, isLoading: isLoadingInstances } = useInstances();
  const argInitial = argSysId?.trim() || null;
  const [sysId, setSysId] = useState<string | null>(argInitial);
  const [sysIdSource, setSysIdSource] = useState<SysIdSource | null>(argInitial ? "arg" : null);
  const [detectionDone, setDetectionDone] = useState<boolean>(argInitial !== null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (detectionDone || sysId) return;
    let cancelled = false;
    (async () => {
      try {
        const selection = (await getSelectedText())?.trim();
        if (cancelled) return;
        if (selection && SYS_ID_RE.test(selection)) {
          setSysId(selection);
          setSysIdSource("selection");
        }
      } catch {
        // ignore selection errors (no selection / no permission)
      }

      if (!cancelled) setDetectionDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedInstance || !sysId) return;
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    (async () => {
      const client = new ServiceNowClient(selectedInstance);
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
          showToast(Toast.Style.Failure, "Could not search for Sys ID", "Admin access is required.");
          setErrorMessage("Admin access is required to run this lookup.");
          setIsLoading(false);
        } else if (answer != null && answer[1]) {
          const table = answer[1].split("^")[0];
          open(`${getInstanceBaseUrl(selectedInstance)}/${table}.do?sys_id=${sysId}`);
          popToRoot();
        } else {
          const label = selectedInstance.alias || selectedInstance.name;
          showToast(Toast.Style.Failure, `Sys ID not found on ${label}`);
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
    const aux = instances.find((i) => i.id === newValue);
    if (aux) {
      setSelectedInstance(aux);
      LocalStorage.setItem("selected-instance", JSON.stringify(aux));
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
                  showToast(Toast.Style.Failure, "Missing Sys ID", "Please enter a Sys ID");
                  return;
                }
                setSysId(s);
                setSysIdSource("form");
              }}
            />
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
