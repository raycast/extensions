import {
  Action,
  ActionPanel,
  captureException,
  Form,
  Icon,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { APICallError } from "ai";
import type { StackInput } from "../types";
import { generateStackFields } from "../utils/generate-stack-fields";
import { slugify } from "../utils/slugify";
import { createStackWithFields } from "../utils/stacks";
import { useState } from "react";

type Values = {
  name: string;
  icon: string;
  description: string;
  fields: string;
};

export const NewStackForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      if (isLoading) return;

      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Creating a stack for "${values.name}"`,
      });

      try {
        const fields = await generateStackFields(values.fields);

        const newStack: StackInput = {
          name: {
            key: slugify(values.name.trim()),
            value: values.name.trim(),
          },
          icon: values.icon,
          description: values.description.trim(),
        };

        await createStackWithFields(newStack, fields);

        toast.style = Toast.Style.Success;
        toast.title = `"${values.name}" stack created`;
        popToRoot();
      } catch (error) {
        if (error instanceof APICallError) {
          const { statusCode, message } = error;
          const [title] = message.split(".");
          if (statusCode === 401) {
            toast.style = Toast.Style.Failure;
            toast.title = title.trim();
            toast.primaryAction = {
              title: "Update API key",
              onAction: () => {
                openExtensionPreferences();
                toast.hide();
              },
            };
          }
        } else {
          captureException(error);
          toast.style = Toast.Style.Failure;
          toast.title = "Could not create stack";
        }
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: FormValidation.Required,
      icon: FormValidation.Required,
      description: FormValidation.Required,
      fields: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Stack" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Treat stacks as folders you want to organize your captures in. In a stack you should define exactly what types of data you want stored." />
      <Form.TextField title="Name" placeholder="Plane tickets" {...itemProps.name} />
      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {Array.from(new Set(Object.values(Icon))).map((icon) => (
          <Form.Dropdown.Item key={icon} value={icon} title={icon} icon={icon} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Description"
        placeholder="Prices and airlines for my planned trips"
        info="Haystack AI would use this description to better understand what is stored in this stack."
        {...itemProps.description}
      />
      <Form.TextArea
        title="Fields"
        placeholder="Price, airline and date"
        info="Describe what fields should be generated for this stack. You can edit, add and remove fields later."
        {...itemProps.fields}
      />
    </Form>
  );
};
