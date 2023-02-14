import { environment, showToast, Toast, Form, ActionPanel, Action, launchCommand, LaunchType } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { ApiList } from "../api/list";
import { CreateListFormValues, CreateListPayload } from "../types/list";
import { ListTypes, ListVisualizations, ListIcons } from "../utils/list";

export default function CreateList({ draftValues }: { draftValues?: CreateListFormValues }) {
  const { theme } = environment;
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { handleSubmit, itemProps, reset } = useForm<CreateListFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding list" });

      const payload: CreateListPayload = {
        type: values.type,
        name: values.name,
        description: values.description,
        visualization: values.visualization,
        appearance: {
          hue: values.hue === "" ? null : Number(values.hue),
          icon: values.icon,
        },
      };

      try {
        const [data, error] = await ApiList.create(payload);

        if (data) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully created list 🎉";

          reset({
            type: "list",
            name: "",
            description: "",
            visualization: "list",
            hue: "",
            icon: "",
          });

          await launchCommand({ name: "search_lists", type: LaunchType.UserInitiated });
        }

        if (error) {
          throw new Error(error.message);
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create list";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      type: draftValues?.type ?? "list",
      visualization: draftValues?.visualization ?? "list",
      name: draftValues?.name ?? "",
      description: draftValues?.description ?? "",
      hue: draftValues?.hue ?? "",
      icon: draftValues?.icon ?? "",
    },
    validation: {
      type: FormValidation.Required,
      name: (value) => {
        if (value && /^[^a-ząćęłńóśźż0-9]/.test(value)) {
          return "Name must start with a lower letter or number";
        } else if (value && /[^a-ząćęłńóśźż0-9-.]/.test(value)) {
          return "Name must contain only lower letters, numbers, dashes and periods";
        } else if (!value) {
          return "Name is required";
        }
      },
      hue: (value) => {
        if (value && /(^[^0-9]+)/.test(value)) {
          return "Hue must be a number";
        } else if (value && Number(value) < 0) {
          return "Hue must be greater than 0";
        } else if (value && Number(value) > 360) {
          return "Hue must be less than 360";
        }
      },
    },
  });

  return (
    <Form
      enableDrafts
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create list" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        {ListTypes.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Visualization" {...itemProps.visualization}>
        {ListVisualizations.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField autoFocus title="Name" placeholder="Enter name of list" {...itemProps.name} />

      <Form.TextArea title="Description" placeholder="Describe list" {...itemProps.description} />

      <Form.TextField title="Hue" placeholder="Enter number from 0 to 360" {...itemProps.hue} />

      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {ListIcons.map((item) => (
          <Form.Dropdown.Item
            key={item.value}
            value={item.value}
            title={item.name}
            icon={{ source: `${item.icon}.svg`, tintColor: theme === "dark" ? "#FFFFFF" : "#000000" }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
