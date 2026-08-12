import * as React from "react";
import type * as Types from "@ui/types.ts";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { ZabbixPostEventAcknowledgeParams } from "@api/zabbix/types";
import { ZabbixClient } from "@api/zabbix/main";

interface formData {
  message: string;
  severity?: string;
  suppressUntil: Date | null;
  suppressIndefinitely: boolean;
  acknowledge: boolean;
}

export function AcknowledgeForm({
  config,
  revalidateData,
  eventName,
  eventId,
}: {
  config: Types.LocalStorageZabbixServer;
  revalidateData: () => Promise<void>;
  eventName: string;
  eventId: string;
}): React.JSX.Element {
  /* Raycast */
  const { pop } = useNavigation();

  /* UI */
  const [IsLoading, SetIsLoading] = React.useState<boolean>(false);

  /* Form */
  const { handleSubmit, itemProps } = useForm<formData>({
    async onSubmit(values) {
      /* Set Loading */
      SetIsLoading(true);

      /* Set Post Params */
      const params: ZabbixPostEventAcknowledgeParams = {
        eventids: eventId,
        action: 0,
      };
      if (values.message !== "") {
        params.action! += 4;
        params.message = values.message;
      }
      if (values.severity !== "99") {
        params.action! += 8;
        params.severity = Number(values.severity);
      }
      if (values.suppressIndefinitely) {
        params.action! += 32;
        params.suppress_until = 0;
      } else if (values.suppressUntil) {
        params.action! += 32;
        params.suppress_until = values.suppressUntil.getTime() / 1000;
      }
      if (values.acknowledge) {
        params.action! += 2;
      }

      /* Show Error if all values are undefined */
      if (params.action === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please configure at least one change",
        });
        SetIsLoading(false);
        return;
      }

      /* Zabbix Post */
      try {
        const client = new ZabbixClient({ url: config.url, key: config.key });
        await client.MethodEventAcknowledge(params);
        await revalidateData();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : String(error),
        });
      }

      /* Set Loading */
      SetIsLoading(false);
    },
  });

  const actions = React.useMemo(() => {
    if (IsLoading) return;

    return (
      <ActionPanel>
        <Action.SubmitForm
          title="Submit"
          icon={Icon.Plus}
          onSubmit={handleSubmit}
        />
      </ActionPanel>
    );
  }, [IsLoading]);

  return (
    <Form actions={actions} isLoading={IsLoading}>
      <Form.Description title="Problem" text={eventName} />
      <Form.TextArea
        title="Message"
        autoFocus={true}
        enableMarkdown={false}
        {...itemProps.message}
      />
      <Form.Dropdown title="Change Severity" {...itemProps.severity}>
        <Form.Dropdown.Item title="" value="99" />
        <Form.Dropdown.Item title="Not Classified" value="0" icon={Icon.Info} />
        <Form.Dropdown.Item title="Info" value="1" icon={Icon.Info} />
        <Form.Dropdown.Item title="Warning" value="2" icon={Icon.Warning} />
        <Form.Dropdown.Item title="Average" value="3" icon={Icon.Warning} />
        <Form.Dropdown.Item title="High" value="4" icon={Icon.XMarkCircle} />
        <Form.Dropdown.Item
          title="Disaster"
          value="5"
          icon={Icon.XMarkCircle}
        />
      </Form.Dropdown>
      <Form.DatePicker
        title="Suppress Until"
        type={Form.DatePicker.Type.Date}
        min={new Date()}
        {...itemProps.suppressUntil}
      />
      <Form.Checkbox
        title="Suppress Indefinitely"
        label="Yes"
        {...itemProps.suppressIndefinitely}
      />
      <Form.Checkbox
        title="Acknowledge"
        label="Yes"
        {...itemProps.acknowledge}
      />
    </Form>
  );
}
