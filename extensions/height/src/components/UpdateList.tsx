import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";

import { getList, updateList } from "@/api/list";
import { ListObject, UpdateListFormValues, UpdateListPayload } from "@/types/list";
import { CachedPromiseMutateType } from "@/types/utils";
import { ListColors, ListTypes, ListVisualizations } from "@/utils/list";

type Props = {
  list: ListObject;
  mutateList: CachedPromiseMutateType<typeof getList>;
};

export default function UpdateList({ list, mutateList }: Props) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { handleSubmit, itemProps, reset } = useForm<UpdateListFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating list" });

      const payload: UpdateListPayload = {
        type: values.type,
        name: values.name,
        description: values.description,
        visualization: values.visualization,
      };

      if (values.hue && list.appearance?.icon) {
        payload.appearance = {
          hue: Number(values.hue),
          icon: list.appearance?.icon,
        };
      }

      try {
        await mutateList(updateList(list.id, payload));

        toast.style = Toast.Style.Success;
        toast.title = "Successfully updated list 🎉";

        reset({
          type: "list",
          name: "",
          description: "",
          visualization: "list",
          hue: "",
        });

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update list 😥";
        toast.message = error instanceof Error ? error.message : undefined;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      type: list.type ?? "list",
      visualization: list.visualization ?? "list",
      name: list.name ?? "",
      description: list.description ?? "",
      hue: typeof list.appearance?.hue === "number" ? String(list.appearance?.hue) : "",
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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update list" onSubmit={handleSubmit} />
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
    </Form>
  );
}
