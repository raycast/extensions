import { useHAStates } from "@components/hooks";
import { ServiceFormFieldEntitiesTagPicker, ServiceFormFieldNumber } from "@components/services/form";
import { HAServiceCall, useServiceCalls } from "@components/services/hooks";
import {
  fullHAServiceName,
  getHAServiceCallData,
  getHAServiceQuicklink,
  getNameOfHAServiceField,
} from "@components/services/utils";
import { ha } from "@lib/common";
import { getFriendlyName } from "@lib/utils";
import { Action, ActionPanel, Form, Icon, Keyboard, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { parse, stringify } from "yaml";

export default function ServiceCallCommand() {
  const { data: services, error, isLoading } = useServiceCalls();
  const { states } = useHAStates();
  if (error) {
    showFailureToast(error, { title: "Could not fetch Service Calls" });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>({});
  const handle = async (input: Form.Values, options?: { popToRootOnSuccessful?: boolean }) => {
    try {
      const payload = yamlMode ? parse(yamlText) : formData;
      const service = services?.find((s) => fullHAServiceName(s) === input.service);
      if (!service) {
        throw new Error(`Could not get service for id "${input.service}"`);
      }

      const response = await ha.callService(service.domain, service.service, payload, {
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
  const [yamlText, setYamlText] = useState<string>("");
  const [selectedService, setSelectedService] = useState<HAServiceCall>();
  useEffect(() => {
    if (!selectedService) {
      setYamlText("");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataObject = getHAServiceCallData(selectedService);
    setFormData(dataObject);
  }, [selectedService]);
  useEffect(() => {
    setYamlText(stringify(formData).trim());
  }, [formData]);

  const quicklink = () => {
    if (selectedService) {
      return getHAServiceQuicklink({
        domain: selectedService.domain,
        service: selectedService.service,
        data: formData,
      });
    }
    return "";
  };

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
                      setYamlText(stringify(formData).trim());
                    } else {
                      setFormData(parse(yamlText));
                    }
                    setYamlMode(newYamlMode);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {selectedService && (
                  <>
                    <Action.CreateQuicklink
                      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                      quicklink={{
                        link: quicklink(),
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Quicklink to Clipboard"
                      shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
                      content={quicklink()}
                    />
                  </>
                )}
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="service"
        title="Service"
        value={selectedService ? fullHAServiceName(selectedService) : undefined}
        onChange={(newService) => setSelectedService(services?.find((s) => fullHAServiceName(s) === newService))}
      >
        {services?.map((s) => (
          <Form.Dropdown.Item
            key={fullHAServiceName(s)}
            value={fullHAServiceName(s)}
            title={`${s.domain}: ${s.name}`}
            keywords={[fullHAServiceName(s), s.domain, s.service]}
          />
        ))}
      </Form.Dropdown>
      {!yamlMode && selectedService?.meta.target?.entity && (
        <Form.TagPicker
          id="entity_id"
          title="Target Entities"
          placeholder="Target Entities"
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
          if (v.collapsed === true) {
            return;
          }
          const sel = v.selector;
          if (
            sel?.text !== undefined ||
            sel?.area !== undefined ||
            sel?.floor !== undefined ||
            sel?.config_entry !== undefined ||
            sel?.icon !== undefined ||
            sel?.label !== undefined ||
            sel?.device !== undefined ||
            sel?.theme !== undefined
          ) {
            return (
              <Form.TextField
                id={k}
                title={getNameOfHAServiceField(v, k)}
                value={formData[k]}
                placeholder={v.description}
                onChange={(nv) => setFormData({ ...formData, [k]: nv })}
              />
            );
          } else if (sel?.object !== undefined) {
            return (
              <Form.TextArea
                id={k}
                title={`${getNameOfHAServiceField(v, k)} (yaml)`}
                value={formData[k]}
                placeholder={v.description}
                onChange={(nv) => {
                  try {
                    const no = nv.trim().length <= 0 ? {} : parse(nv);
                    setFormData({ ...formData, [k]: no });
                  } catch (error) {
                    //
                  }
                }}
              />
            );
          } else if (sel?.number !== undefined) {
            return (
              <ServiceFormFieldNumber
                id={k}
                value={formData[k] !== undefined ? `${formData[k]}` : undefined}
                field={v}
                onChange={(nv) => setFormData({ ...formData, [k]: nv })}
              />
            );
          } else if (sel?.entity !== undefined) {
            return (
              <ServiceFormFieldEntitiesTagPicker
                id={k}
                field={v}
                states={states}
                value={formData[k]}
                onChange={(newValue) => setFormData({ ...formData, [k]: newValue })}
              />
            );
          } else if (sel?.select !== undefined) {
            const opts = sel?.select?.options;
            if (opts === undefined || opts === null || opts.length <= 0) {
              return;
            }
            return (
              <Form.Dropdown
                id={k}
                title={getNameOfHAServiceField(v, k)}
                value={formData[k]}
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
                title={getNameOfHAServiceField(v, k)}
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
                title={getNameOfHAServiceField(v, k)}
                value={formData[k]}
                placeholder={v.description}
                onChange={(nv) => setFormData({ ...formData, [k]: nv })}
              />
            );
          }
        })}
      {yamlMode && <Form.TextArea id="yamltext" title="Data (yaml)" value={yamlText} onChange={setYamlText} />}
    </Form>
  );
}
