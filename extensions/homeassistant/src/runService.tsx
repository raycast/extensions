import { HAServiceCall, useServiceCalls } from "@components/services/hooks";
import { ha } from "@lib/common";
import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
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
  if (error) {
    showFailureToast(error, { title: "Could not fetch Service Calls" });
  }
  const handle = async (input: Form.Values) => {
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
      popToRoot();
    } catch (error) {
      showFailureToast(error, { title: "Error calling Service" });
    }
  };
  const [data, setData] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>();
  useEffect(() => {
    const serviceMeta = services?.find((s) => fullServiceName(s) === selectedService);
    if (!serviceMeta) {
      setData("");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataObject = getServiceCallData(serviceMeta);
    const yamlData = stringify(dataObject).trim();
    setData(yamlData);
  }, [selectedService]);
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>{selectedService && <Action.SubmitForm title="Run Service" onSubmit={handle} />}</ActionPanel>
      }
    >
      <Form.Dropdown id="service" title="Service" value={selectedService} onChange={setSelectedService}>
        {services?.map((s) => (
          <Form.Dropdown.Item
            key={fullServiceName(s)}
            value={fullServiceName(s)}
            title={`${s.domain}: ${s.name}`}
            keywords={[fullServiceName(s), s.domain, s.service]}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="data" title="Data (yaml)" value={data} onChange={setData} />
    </Form>
  );
}
