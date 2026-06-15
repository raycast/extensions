import { useEffect, useState } from "react";
import { Action, ActionPanel, Alert, Form, Icon, Image, List, confirmAlert, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { catchError } from "../errors.js";
import * as git from "../git.js";
import operation from "../operation.js";

function TextField({
  actionIcon,
  actionTitle,
  onSubmit,
}: {
  actionIcon?: Image.ImageLike;
  actionTitle: string;
  onSubmit: (text: string) => void | Promise<void>;
}) {
  const { handleSubmit, itemProps } = useForm<{
    text?: string;
  }>({
    onSubmit: (values) => {
      onSubmit(values.text ?? "");
    },
    validation: {
      text: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={actionIcon} title={actionTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Pattern" {...itemProps.text} placeholder="e.g. extensions/forked-extensions" />
      <Form.Description text="Enter a path relative to the project root." />
    </Form>
  );
}

function ManageSparseCheckoutView({ onChange }: { onChange?: () => void }) {
  const [sparseCheckoutDirectories, setSparseCheckoutDirectories] = useState<string[]>([]);
  const { pop, push } = useNavigation();

  const loadSparseCheckoutList = async () => {
    const directories = await git.sparseCheckoutList();
    setSparseCheckoutDirectories(directories);
  };

  useEffect(() => {
    catchError(loadSparseCheckoutList)();
  }, []);

  return (
    <List actions={<ActionPanel></ActionPanel>}>
      {sparseCheckoutDirectories.map((directory) => {
        return (
          <List.Item
            key={directory}
            title={directory}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Plus}
                  title="Add New Sparse-Checkout"
                  onAction={() => {
                    push(
                      <TextField
                        actionTitle="Add"
                        onSubmit={async (pattern) => {
                          await operation.addSparseCheckoutPattern(pattern, loadSparseCheckoutList);
                          onChange?.();
                          pop();
                        }}
                      />,
                    );
                  }}
                />
                <Action
                  style={Action.Style.Destructive}
                  icon={Icon.Minus}
                  title="Remove This Sparse-Checkout"
                  onAction={async () => {
                    const yes = await confirmAlert({
                      title: "Remove this sparse-checkout pattern?",
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Confirm",
                      },
                    });
                    if (yes) {
                      await operation.removeSparseCheckoutPattern(directory, loadSparseCheckoutList);
                      onChange?.();
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function ManageSparseCheckout({ onChange }: { onChange?: () => void }) {
  return (
    <Action.Push
      icon={Icon.Hammer}
      title="Manage Sparse-Checkout"
      target={<ManageSparseCheckoutView onChange={onChange} />}
    />
  );
}
