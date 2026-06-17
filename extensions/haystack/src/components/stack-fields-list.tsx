import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { StackField, StackFieldType } from "../types";
import { deleteFieldFromStack, getStackFields } from "../utils/stacks";
import { EditStackFieldForm } from "./edit-stack-field-form";

const getStackFieldIcon = ({ type }: { type: StackFieldType }) => {
  switch (type) {
    case "text":
      return Icon.Text;
    case "number":
      return Icon.PlusMinusDivideMultiply;
    case "date":
      return Icon.Calendar;
    case "time":
      return Icon.Clock;
    case "currency":
      return Icon.Coins;
    case "boolean":
      return Icon.CheckCircle;
    default:
      return Icon.Text;
  }
};

export const StackFieldsList = ({ stackId }: { stackId: string }) => {
  const { isLoading, data, revalidate } = usePromise(async () => {
    let data: StackField[] = [];

    try {
      data = await getStackFields(stackId);
    } catch (error) {
      captureException(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load stack fields",
      });
    }

    return data.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, []);

  const handleDelete = async (stackId: string, fieldId: string, fieldName: string) => {
    const confirmed = await confirmAlert({
      title: "Remove Field",
      message: `Are you sure you want to remove "${fieldName}" from this stack? This action cannot be undone.`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await deleteFieldFromStack(stackId, fieldId);
      revalidate();
    } catch (error) {
      captureException(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete field",
      });
    }
  };

  return (
    <List isLoading={isLoading}>
      {data?.map(({ id, label, description, type, isTitleField }) => (
        <List.Item
          key={id}
          title={label.value}
          subtitle={description}
          accessories={[
            {
              tag: isTitleField ? "Title Field" : undefined,
            },
          ]}
          icon={getStackFieldIcon({ type })}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Field"
                icon={Icon.Pencil}
                target={
                  <EditStackFieldForm
                    stackId={stackId}
                    id={id}
                    onUpdate={revalidate}
                    label={label.value}
                    description={description}
                    type={type}
                    isTitleField={isTitleField}
                  />
                }
              />
              <Action
                title="Remove Field"
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => handleDelete(stackId, id, label.value)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
