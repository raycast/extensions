import { MutatePromise, useForm } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  Color,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  Keyboard,
} from "@raycast/api";
import { DeleteItemCommand, DeleteItemCommandInput, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Table } from "../../dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { getErrorMessage } from "../../util";

interface DeleteItemFormValues {
  hashKey: string;
  rangeKey: string;
  useConditionExpression: boolean;
  conditionExpression: string;
  useExpressionAttributeNames: boolean;
  expressionAttributeNames: string;
  useExpressionAttributeValues: boolean;
  expressionAttributeValues: string;
}

export const DeleteItemForm = ({
  table,
  mutate,
  retryInitValues,
}: {
  table: Table;
  mutate: MutatePromise<Table[] | undefined>;
  retryInitValues?: DeleteItemFormValues;
}) => {
  const { pop, push } = useNavigation();
  const hasRangeKey = table.KeySchema?.some((k) => k.KeyType === "RANGE");
  const tablePrimaryKey = table.keys[`${table.TableName}`];
  const { values, handleSubmit, itemProps } = useForm<DeleteItemFormValues>({
    onSubmit: async (values) =>
      confirmAlert({
        title: "Are you sure?",
        message: "This action cannot be undone.",
        icon: { source: Icon.Trash, tintColor: Color.Red },
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
          onAction: async () => {
            const input: DeleteItemCommandInput = {
              TableName: table.TableName,
              ReturnConsumedCapacity: "TOTAL",
              Key: marshall({
                [tablePrimaryKey.hashKey.name]:
                  tablePrimaryKey.hashKey.type === "N" ? Number(values.hashKey) : values.hashKey,
                ...(hasRangeKey && {
                  [tablePrimaryKey.rangeKey!.name]:
                    tablePrimaryKey.rangeKey!.type === "N" ? Number(values.rangeKey) : values.rangeKey,
                }),
              }),
              ...(values.useConditionExpression && { ConditionExpression: values.conditionExpression }),
              ...(values.useExpressionAttributeNames && {
                ExpressionAttributeNames: JSON.parse(values.expressionAttributeNames),
              }),
              ...(values.useExpressionAttributeValues && {
                ExpressionAttributeValues: marshall(JSON.parse(values.expressionAttributeValues)),
              }),
            };

            const toast = await showToast({
              style: Toast.Style.Animated,
              title: `❗Deleting item in ${table.TableName}`,
            });

            mutate(new DynamoDBClient({}).send(new DeleteItemCommand(input)), {
              optimisticUpdate: (tables) => {
                if (!tables) return undefined;
                return tables.map((t) =>
                  t.TableName !== table.TableName ? t : { ...t, ItemCount: Math.max((t.ItemCount ?? 0) - 1, 0) },
                );
              },
              shouldRevalidateAfter: false,
            })
              .then(({ ConsumedCapacity }) => {
                toast.style = Toast.Style.Success;
                toast.title = "✅ Item deleted";
                toast.message = `Consumed capacity: ${ConsumedCapacity?.CapacityUnits}`;
              })
              .catch((err) => {
                captureException(err);
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to delete item";
                toast.message = getErrorMessage(err);
                toast.primaryAction = {
                  title: "Retry",
                  shortcut: Keyboard.Shortcut.Common.Refresh,
                  onAction: () => {
                    push(<DeleteItemForm {...{ table, mutate, retryInitValues: values }} />);
                    toast.hide();
                  },
                };
                toast.secondaryAction = {
                  title: "Copy Error",
                  shortcut: Keyboard.Shortcut.Common.Copy,
                  onAction: () => {
                    Clipboard.copy(getErrorMessage(err));
                    toast.hide();
                  },
                };
              })
              .finally(pop);
          },
        },
      }),
    validation: {
      hashKey: (value) => {
        if (!value || value.length < 1) {
          return "Hash Key must be provided";
        }
        if (tablePrimaryKey.hashKey!.type === "N" && Number.isNaN(Number(value))) {
          return "Hash Key must be a number";
        }
      },
      rangeKey: (value) => {
        if (hasRangeKey) {
          if (!value || value.length < 1) {
            return "Range Key is required";
          }
          if (tablePrimaryKey.rangeKey!.type === "N" && Number.isNaN(Number(value))) {
            return "Range Key must be a number";
          }
        }
      },
      conditionExpression: (value) => {
        if (values.useConditionExpression) {
          if (!value || value.length < 1) {
            return "Condition Expression is required (if checked)";
          }
        }
      },
      expressionAttributeNames: (value) => {
        if (values.useExpressionAttributeNames) {
          if (!value || value.length < 2) {
            return "Expression Attribute Names are required (if checked)";
          }
          try {
            JSON.parse(value!);
          } catch (_err) {
            return "Expression Attribute Names must be valid JSON";
          }
        }
      },
      expressionAttributeValues: (value) => {
        if (values.useExpressionAttributeValues) {
          if (!value || value.length < 2) {
            return "Expression Attribute Values are required (if checked)";
          }
          try {
            const json = JSON.parse(value!);
            marshall(json, { removeUndefinedValues: true });
          } catch (_err) {
            return "Expression Attribute Values must be JSON that can be marshalled to DynamoDB";
          }
        }
      },
    },
    initialValues: retryInitValues || {
      useConditionExpression: false,
      useExpressionAttributeNames: false,
      useExpressionAttributeValues: false,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Delete Item"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
      navigationTitle={"Delete Item"}
    >
      <Form.Description title={"❗"} text={"This action cannot be undone."} />
      <Form.Description title={"Table Name"} text={`${table.TableName}`} />
      <Form.Separator />
      <Form.TextField {...itemProps.hashKey} placeholder="hash key for item..." title={tablePrimaryKey.hashKey.name} />
      {hasRangeKey && (
        <Form.TextField
          {...itemProps.rangeKey}
          placeholder="range key for item..."
          title={tablePrimaryKey.rangeKey?.name}
        />
      )}
      <Form.Checkbox {...itemProps.useConditionExpression} label="Use Condition Expression" />
      {values.useConditionExpression && (
        <Form.TextField
          {...itemProps.conditionExpression}
          placeholder={`attribute_exists(${tablePrimaryKey.hashKey.name})`}
          title="Condition Expression"
        />
      )}
      <Form.Checkbox {...itemProps.useExpressionAttributeNames} label="Use Expression Attribute Names" />
      {values.useExpressionAttributeNames && (
        <Form.TextArea
          {...itemProps.expressionAttributeNames}
          placeholder='{"#n": "name", "#v": "value"}'
          title="Expression Attribute Names"
        />
      )}
      <Form.Checkbox {...itemProps.useExpressionAttributeValues} label="Use Expression Attribute Values" />
      {values.useExpressionAttributeValues && (
        <Form.TextArea
          {...itemProps.expressionAttributeValues}
          placeholder='{":n": "testName", ":v": 1}'
          title="Expression Attribute Values"
          info={"Don't use DynamoDB JSON values here. Use JSON that can be marshalled to DynamoDB."}
        />
      )}
    </Form>
  );
};
