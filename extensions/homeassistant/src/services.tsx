import { useHAStates } from "@components/hooks";
import {
  ServiceFormFieldEntitiesTagPicker,
  ServiceFormFieldNumber,
  ServiceFormFieldObject,
  ServiceFormFieldSelectDropdown,
  ServiceFormTargetEntitiesTagPicker,
} from "@components/services/form";
import { HAServiceCall, useHAServiceCallFormData, useServiceCalls } from "@components/services/hooks";
import { fullHAServiceName, getHAServiceQuicklink, getNameOfHAServiceField } from "@components/services/utils";
import { ha } from "@lib/common";
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

  const [yamlMode, setYamlMode] = useState<boolean>(false);
  const [yamlText, setYamlText] = useState<string>("");
  const [selectedService, setSelectedService] = useState<HAServiceCall>();
  const { fields, userData, setUserDataByKey, setUserData, userDataError } = useHAServiceCallFormData(selectedService);
  const handle = async (input: Form.Values, options?: { popToRootOnSuccessful?: boolean }) => {
    try {
      const payload = yamlMode ? parse(yamlText) : userData;
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
  useEffect(() => {
    setYamlText("");
    setUserData({});
  }, [selectedService]);
  console.log("userdata: ", JSON.stringify(userData));

  const quicklink = () => {
    if (selectedService) {
      return getHAServiceQuicklink({
        domain: selectedService.domain,
        service: selectedService.service,
        data: userData,
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
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const types: Record<string, any> = {};
                      for (const f of fields) {
                        if (userData[f.id]) {
                          types[f.id] = f.toYaml(userData[f.id]);
                        }
                      }
                      setYamlText(stringify(types).trim());
                    } else {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const types: Record<string, any> = {};
                      const yamlObject = parse(yamlText);
                      for (const f of fields) {
                        const yamlValue = yamlObject[f.id];
                        if (yamlValue !== undefined) {
                          const uiValue = f.fromYaml(yamlValue);
                          if (uiValue !== undefined) {
                            types[f.id] = uiValue;
                          }
                        }
                      }
                      setUserData(types);
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
      {!yamlMode &&
        selectedService &&
        fields?.map((f) => {
          switch (f.type) {
            case "target_entity": {
              return (
                <ServiceFormTargetEntitiesTagPicker
                  id={`${f.id}_${fullHAServiceName(selectedService)}`}
                  states={states}
                  value={userData[f.id]}
                  target={selectedService.meta.target?.entity}
                  onChange={(newValue) => setUserDataByKey("entity_id", newValue)}
                />
              );
            }
            case "text":
            case "area":
            case "floor":
            case "config_entry":
            case "icon":
            case "label":
            case "device":
            case "theme": {
              return (
                <Form.TextField
                  id={`${f.id}_${fullHAServiceName(selectedService)}`}
                  title={getNameOfHAServiceField(f.meta, f.id)}
                  value={userData[f.id]}
                  placeholder={f.meta.description}
                  onChange={(nv) => {
                    setUserDataByKey(f.id, nv.length > 0 ? nv : undefined);
                  }}
                  error={userDataError[f.id]}
                />
              );
            }
            case "object": {
              return (
                <ServiceFormFieldObject
                  id={`${f.id}_${fullHAServiceName(selectedService)}`}
                  field={f.meta}
                  placeholder={f.meta.description}
                  value={userData[f.id]}
                  onChange={(nv) => setUserDataByKey(f.id, nv)}
                  error={userDataError[f.id]}
                />
              );
            }
            case "number": {
              return (
                <ServiceFormFieldNumber
                  id={`${f.id}_${fullHAServiceName(selectedService)}`}
                  field={f.meta}
                  placeholder={f.meta.description}
                  value={userData[f.id]}
                  onChange={(nv) => setUserDataByKey(f.id, nv)}
                  error={userDataError[f.id]}
                />
              );
            }
            case "entity": {
              return (
                <ServiceFormFieldEntitiesTagPicker
                  id={`${f.id}_${fullHAServiceName(selectedService)}`}
                  field={f.meta}
                  placeholder={f.meta.description}
                  states={states}
                  value={userData[f.id]}
                  onChange={(nv) => setUserDataByKey(f.id, nv)}
                  error={userDataError[f.id]}
                />
              );
            }
            case "select": {
              return (
                <ServiceFormFieldSelectDropdown
                  id={`${f.id}_${fullHAServiceName(selectedService)}`}
                  field={f.meta}
                  placeholder={f.meta.description}
                  value={userData[f.id]}
                  onChange={(nv) => setUserDataByKey(f.id, nv)}
                  error={userDataError[f.id]}
                />
              );
            }
            case "boolean": {
              return (
                <Form.Checkbox
                  id={`${f.id}_${fullHAServiceName(selectedService)}`}
                  title={getNameOfHAServiceField(f.meta, f.id)}
                  label={f.meta.description}
                  value={userData[f.id]}
                  onChange={(nv) => setUserDataByKey(f.id, nv)}
                  error={userDataError[f.id]}
                />
              );
            }
          }
        })}
      <Form.Separator />
      {yamlMode && <Form.TextArea id="yamltext" title="Data (yaml)" value={yamlText} onChange={setYamlText} />}
    </Form>
  );
}
