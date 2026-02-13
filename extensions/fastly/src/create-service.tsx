import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { createService } from "./api";
import { ServiceDetail } from "./views/service-detail";
import { FastlyService } from "./types";
import { FormValidation, useForm } from "@raycast/utils";

export default function CreateService() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ name: string; domain: string; origin: string }>({
    async onSubmit(values) {
      try {
        setIsLoading(true);
        const newService = await createService(values);

        await showToast({
          style: Toast.Style.Success,
          title: "Service created",
          message: `Created ${values.name}`,
        });

        const service: FastlyService = {
          id: newService.id,
          name: values.name,
          type: "vcl",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        push(<ServiceDetail service={service} />);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create service",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: FormValidation.Required,
      domain: FormValidation.Required,
      origin: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Service" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Enter service name" {...itemProps.name} />
      <Form.TextField
        title="Domain"
        placeholder="www.your-name.com"
        info="Example: www.your-name.com (you can also use your-name.global.ssl.fastly.net if you don't have a domain yet)"
        {...itemProps.domain}
      />
      <Form.TextField
        title="Origin Server"
        placeholder="origin.your-name.com"
        info="The hostname of your origin server (e.g., origin.your-name.com, backend.your-name.com)"
        {...itemProps.origin}
      />
    </Form>
  );
}
