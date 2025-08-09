import { showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { useMonitorActions } from "./useMonitorActions";
import { transformFormDataToMonitor } from "../utils/monitorUtils";
import { CreateMonitorForm } from "../types";

export function useCreateMonitor(apiKey: string) {
  const { createMonitor } = useMonitorActions(apiKey);
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<CreateMonitorForm>({
    initialValues: {
      method: "GET",
      interval: "60",
      timeout: "7000",
      regions: ["as-jpn-hnd"],
      incidentConfirmations: "1",
      recoveryConfirmations: "1",
      followRedirects: true,
      tlsSkipVerify: false,
    },
    async onSubmit(values) {
      if (!apiKey) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key Required",
          message: "Please set your Phare API key in preferences",
        });
        return;
      }

      setIsLoading(true);
      const monitorData = transformFormDataToMonitor(values);
      await createMonitor(monitorData);
      setIsLoading(false);
    },
    validation: {
      name: FormValidation.Required,
      url: (value) => {
        if (!value) {
          return "URL is required";
        }
        try {
          new URL(value);
        } catch {
          return "Please enter a valid URL";
        }
      },
      regions: (value) => {
        if (!value || value.length === 0) {
          return "At least one region must be selected";
        }
      },
    },
  });

  return {
    handleSubmit,
    itemProps,
    isLoading,
  };
}
