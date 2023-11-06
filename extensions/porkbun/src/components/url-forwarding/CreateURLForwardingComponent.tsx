import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { URL_FORWARDING_TYPES } from "../../utils/constants";
import { useState } from "react";
import { createUrlForwarding } from "../../utils/api";

type CreateURLForwardingComponentProps = {
    domain: string;
    onUrlForwardingAdded: () => void;
}
export default function CreateURLForwardingComponent({ domain, onUrlForwardingAdded }: CreateURLForwardingComponentProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    type FormValues = {
        subdomain: string;
        location: string;
        type: string;
        includePath: boolean;
        wildcard: boolean;
    }
    const { handleSubmit, itemProps } = useForm<FormValues>({
        async onSubmit(values) {
          setIsLoading(true);
          const includePath = values.includePath ? "yes" : "no";
          const wildcard = values.includePath ? "yes" : "no";

            const response = await createUrlForwarding(domain, {...values, type: values.type==="temporary" ? "temporary" : values.type==="permanent" ? "permanent" : "masked", includePath, wildcard });
            if (response.status === "SUCCESS") {
              await showToast({
                style: Toast.Style.Success,
                title: "SUCCESS",
                message: `Created URL Forwarding`,
              });
            }
          setIsLoading(false);
          onUrlForwardingAdded();
        },
        validation: {
          location: FormValidation.Required
        }
      });

      return <Form navigationTitle="Create URL Forwarding" isLoading={isLoading} actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
      </ActionPanel>}>
        <Form.Description title="Domain" text={domain} />
        <Form.TextField title="Hostname" placeholder="raycast" info="Leave blank to forward the root domain" {...itemProps.subdomain} />
        <Form.Description text={`.${domain}`} />

        <Form.TextField title="Forward Traffic To" placeholder="https://raycast.com" {...itemProps.location} />
        <Form.Checkbox label="Use Wildcard URL Forwarding" info="This will also forward all subhosts of the hostname being forwarded. To forward all traffic to your domain, leave the hostname field above blank and leave this box checked" {...itemProps.wildcard} />
        <Form.Dropdown title="HTTP Redirect Type" {...itemProps.type}>
            {URL_FORWARDING_TYPES.map(type => <Form.Dropdown.Item key={type.title} title={type.title} value={type.value} />)}
        </Form.Dropdown>
        <Form.Checkbox label="Include the requested URI path in the redirection." {...itemProps.includePath} />
      </Form>
}