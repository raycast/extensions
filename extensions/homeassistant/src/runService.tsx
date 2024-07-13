import { useHAStates } from "@components/hooks";
import { HAServiceCall, useServiceCalls } from "@components/services/hooks";
import { ha } from "@lib/common";
import { getFriendlyName } from "@lib/utils";
import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { parse, stringify } from "yaml";

function fullServiceName(serviceCall: HAServiceCall) {
  return `${serviceCall.domain}.${serviceCall.service}`;
}

function getServiceCallData(serviceCall: HAServiceCall) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  if (serviceCall.meta.target) {
    if (serviceCall.meta.target.entity) {
      result["entity_id"] = [];
    }
  }

  for (const [k, v] of Object.entries(serviceCall.meta.fields)) {
    if (v?.required === true) {
      const selector = v?.selector;
      if (
        selector?.text !== undefined ||
        selector?.area !== undefined ||
        selector?.floor !== undefined ||
        selector?.config_entry !== undefined ||
        selector?.object !== undefined
      ) {
        result[k] = "";
      } else if (selector?.number !== undefined) {
        let val = 0;
        const num = selector?.number;
        if (num?.min !== null && num?.min !== undefined) {
          val = num.min;
        }
        result[k] = val;
      } else {
        result[k] = {};
      }
    }
  }
  return result;
}

export default function ServiceCallCommand() {
  const { data: services, error, isLoading } = useServiceCalls();
  const { states } = useHAStates();
  if (error) {
    showFailureToast(error, { title: "Could not fetch Service Calls" });
  }
  const handle = async (input: Form.Values, options?: { popToRootOnSuccessful?: boolean }) => {
    try {
      const service = services?.find((s) => fullServiceName(s) === input.service);
      if (!service) {
        throw new Error(`Could not get service for id "${input.service}"`);
      }

      const response = await ha.callService(service.domain, service.service, parse(input.data), {
        throwException: false,
      });
      if (!response) {
        throw new Error("No response");
      }
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.statusText);
      }
      showToast({ style: Toast.Style.Success, title: "Service called successfully" });
      if (options?.popToRootOnSuccessful === true) {
        popToRoot();
      }
    } catch (error) {
      showFailureToast(error, { title: "Error calling Service" });
    }
  };
  const [yamlMode, setYamlMode] = useState<boolean>(false);
  const [data, setData] = useState<string>("");
  const [selectedService, setSelectedService] = useState<HAServiceCall>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>({});
  useEffect(() => {
    if (!selectedService) {
      setData("");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataObject = getServiceCallData(selectedService);
    setFormData(dataObject);
  }, [selectedService]);
  useEffect(() => {
    setData(stringify(formData));
  }, [formData]);
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {selectedService && (
            <>
              <ActionPanel.Section>
                <Action.SubmitForm title="Run Service" icon={Icon.Terminal} onSubmit={handle} />
                <Action.SubmitForm
                  title="Run Service And Close"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  icon={Icon.Terminal}
                  onSubmit={(values) => handle(values, { popToRootOnSuccessful: true })}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title={yamlMode ? "Switch to UI Mode" : "Switch to Yaml Mode"}
                  icon={yamlMode ? Icon.AppWindow : Icon.AppWindowList}
                  onAction={() => {
                    const newYamlMode = !yamlMode;
                    if (newYamlMode) {
                      setData(stringify(formData));
                    } else {
                      setFormData(parse(data));
                    }
                    setYamlMode(newYamlMode);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="service"
        title="Service"
        value={selectedService ? fullServiceName(selectedService) : undefined}
        onChange={(newService) => setSelectedService(services?.find((s) => fullServiceName(s) === newService))}
      >
        {services?.map((s) => (
          <Form.Dropdown.Item
            key={fullServiceName(s)}
            value={fullServiceName(s)}
            title={`${s.domain}: ${s.name}`}
            keywords={[fullServiceName(s), s.domain, s.service]}
          />
        ))}
      </Form.Dropdown>
      {!yamlMode && selectedService?.meta.target?.entity && (
        <Form.TagPicker
          id="entity_id"
          title="Target Entities"
          value={formData.entity_id}
          onChange={(newValue) => setFormData({ ...formData, entity_id: newValue })}
        >
          {states?.map((s) => (
            <Form.TagPicker.Item value={s.entity_id} title={`${getFriendlyName(s)} (${s.entity_id})`} />
          ))}
        </Form.TagPicker>
      )}
      {!yamlMode &&
        Object.entries(selectedService?.meta.fields ?? {}).map(([k, v]) => {
          const sel = v.selector;
          if (
            sel?.text !== undefined ||
            sel?.area !== undefined ||
            sel?.floor !== undefined ||
            sel?.config_entry !== undefined ||
            sel?.object !== undefined ||
            sel?.icon !== undefined ||
            sel?.label !== undefined ||
            sel?.device !== undefined ||
            sel?.theme !== undefined
          ) {
            return (
              <Form.TextField
                id={k}
                title={v.name}
                value={formData[k] ?? ""}
                placeholder={v.description}
                onChange={(nv) => setFormData({ ...formData, [k]: nv })}
              />
            );
          } else if (sel?.number !== undefined) {
            let val = 0;
            const num = sel?.number;
            if (num?.min !== null && num?.min !== undefined) {
              val = num.min;
            }
            return (
              <Form.TextField
                id={k}
                title={v.name}
                value={formData[k] ?? val.toString()}
                placeholder={v.description}
                onChange={(nv) => setFormData({ ...formData, [k]: nv })}
              />
            );
          } else if (sel?.entity !== undefined) {
            return (
              <Form.TagPicker
                id={k}
                title={v.name}
                value={formData[k] ?? ""}
                onChange={(newValue) => setFormData({ ...formData, [k]: newValue })}
              >
                {states?.map((s) => (
                  <Form.TagPicker.Item value={s.entity_id} title={`${getFriendlyName(s)} (${s.entity_id})`} />
                ))}
              </Form.TagPicker>
            );
          } else if (sel?.select !== undefined) {
            const opts = sel?.select?.options;
            if (opts === undefined || opts === null || opts.length <= 0) {
              return;
            }
            return (
              <Form.Dropdown
                id={k}
                title={v.name}
                value={formData[k] ?? ""}
                onChange={(nv) => setFormData({ ...formData, [k]: nv })}
              >
                {opts.map((o) => (
                  <Form.Dropdown.Item value={o.value} title={o.label} />
                ))}
              </Form.Dropdown>
            );
          } else if (sel?.boolean !== undefined) {
            return (
              <Form.Checkbox
                id={k}
                title={v.name}
                label={v.description}
                value={formData[k] ?? false}
                onChange={(nv) => setFormData({ ...formData, [k]: nv })}
              />
            );
          } else {
            // assume all other fields are strings
            return (
              <Form.TextField
                id={k}
                title={v.name}
                value={formData[k] ?? ""}
                placeholder={v.description}
                onChange={(nv) => setFormData({ ...formData, [k]: nv })}
              />
            );
          }
        })}
      {yamlMode && <Form.TextArea id="data" title="Data (yaml)" value={data} onChange={setData} />}
    </Form>
  );
}
