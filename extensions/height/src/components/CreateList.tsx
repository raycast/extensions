import { Action, ActionPanel, Form, Icon, LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";

import { createList } from "@/api/list";
import { CreateListFormValues, CreateListPayload, ListIcon } from "@/types/list";
import { ListColors, ListIcons, ListTypes, ListVisualizations, getTintColorFromHue } from "@/utils/list";

export default function CreateList({ draftValues }: { draftValues?: CreateListFormValues }) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { handleSubmit, itemProps, reset, values } = useForm<CreateListFormValues>({
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
          icon: values.icon as ListIcon,
        },
      };

      try {
        const [data, error] = await createList(payload);

        if (data) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully created list 🎉";

          reset({
            type: "list",
            name: "",
            description: "",
            visualization: "list",
            hue: "",
            icon: "list",
          });

          await launchCommand({ name: "search_lists", type: LaunchType.UserInitiated });
        }

        if (error) {
          throw new Error(error.message);
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create list 😥";
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
      icon: draftValues?.icon ?? "list",
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
          <Action.SubmitForm title="Create List" icon={Icon.NewDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        {ListTypes.map((type) => (
          <Form.Dropdown.Item key={type.value} value={type.value} title={type.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Visualization" {...itemProps.visualization}>
        {ListVisualizations.map((visualization) => (
          <Form.Dropdown.Item key={visualization.value} value={visualization.value} title={visualization.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField autoFocus title="Name" placeholder="Enter name of list" {...itemProps.name} />

      <Form.TextArea title="Description" placeholder="Describe list" {...itemProps.description} />

      <Form.Dropdown title="Hue" {...itemProps.hue}>
        {ListColors.map((color) => (
          <Form.Dropdown.Item
            key={color.value}
            value={color.value}
            title={color.name}
            icon={{ source: `${color.icon}.svg`, tintColor: color.tintColor }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {ListIcons.map((icon) => (
          <Form.Dropdown.Item
            key={icon.value}
            value={icon.value}
            title={icon.name}
            icon={{
              source: `${icon.icon}.svg`,
              tintColor: getTintColorFromHue(values.hue, ListColors),
            }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
