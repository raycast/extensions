import { FormValidation, showFailureToast, useForm, usePromise } from "@raycast/utils";
import { Action, ActionPanel, Color, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { DynamoDBClient, QueryCommand, QueryCommandInput } from "@aws-sdk/client-dynamodb";
import { Table } from "../../dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import React from "react";
import { sortRecord } from "../../util";

interface QueryFormValues {
  hashKey: string;
  rangeKey: string;
  rangeKeyEnd: string;
  rangeKeyOperator: string;
  indexName: string;
  pageLimit: string;
  useProjectionExpression: boolean;
  projectionExpression: string;
}

export const QueryForm = ({ table }: { table: Table }) => {
  const { push } = useNavigation();
  const { values, handleSubmit, itemProps } = useForm<QueryFormValues>({
    onSubmit: async (values) => {
      const client = new DynamoDBClient({});
      const hasRangeKey = table.keys[values.indexName].rangeKey !== undefined;
      const primaryKey = table.keys[values.indexName];
      const input = {
        TableName: table.TableName,
        KeyConditionExpression: [
          `#${primaryKey.hashKey.name} = :${primaryKey.hashKey.name}`,
          ...(hasRangeKey && values.rangeKey && values.rangeKey.length > 0
            ? [
                "and",
                values.rangeKeyOperator === "between"
                  ? `#${primaryKey.rangeKey!.name} between :${primaryKey.rangeKey!.name} and :${primaryKey.rangeKey!.name}End`
                  : values.rangeKeyOperator === "beginsWith"
                    ? `begins_with(#${primaryKey.rangeKey!.name}, :${primaryKey.rangeKey!.name})`
                    : `#${primaryKey.rangeKey!.name} ${values.rangeKeyOperator} :${primaryKey.rangeKey!.name}`,
              ]
            : []),
        ].join(" "),
        ExpressionAttributeNames: {
          [`#${primaryKey.hashKey.name}`]: primaryKey.hashKey.name,
          ...(hasRangeKey &&
            values.rangeKey!.length > 0 && {
              [`#${primaryKey.rangeKey!.name}`]: primaryKey.rangeKey!.name,
            }),
        },
        ExpressionAttributeValues: marshall({
          [`:${primaryKey.hashKey.name}`]: primaryKey.hashKey.type === "N" ? Number(values.hashKey) : values.hashKey,
          ...(hasRangeKey &&
            values.rangeKey!.length > 0 && {
              [`:${primaryKey.rangeKey!.name}`]:
                primaryKey.rangeKey!.type === "N" ? Number(values.rangeKey) : values.rangeKey,
              ...(values.rangeKeyOperator === "between" && {
                [`:${primaryKey.rangeKey!.name}End`]:
                  primaryKey.rangeKey!.type === "N" ? Number(values.rangeKeyEnd) : values.rangeKeyEnd,
              }),
            }),
        }),
        ...(values.useProjectionExpression && { ProjectionExpression: values.projectionExpression }),
        Limit: Number(values.pageLimit),
        ...(values.indexName !== table.TableName && { IndexName: values.indexName.split(".")[1] }),
      };
      push(
        <QueryResult
          table={table}
          input={input}
          client={client}
          previousConsumedCapacity={0}
          previousItemsCount={0}
          push={push}
        />,
      );
    },
    validation: {
      hashKey: (value) => {
        if (!value || value.length < 1) {
          return "Hash Key must be provided";
        }
        if (table.keys[values.indexName].hashKey.type === "N" && Number.isNaN(Number(value))) {
          return "Hash Key must be a number";
        }
      },
      rangeKey: (value) => {
        if (value && value.length > 0) {
          if (table.keys[values.indexName].rangeKey!.type === "N" && Number.isNaN(Number(value))) {
            return "Range Key must be a number";
          }
        }
      },
      rangeKeyEnd: (value) => {
        if (value && value.length > 0) {
          if (table.keys[values.indexName].rangeKey!.type === "N" && Number.isNaN(Number(value))) {
            return "Range Key must be a number";
          }
        }
      },
      indexName: FormValidation.Required,
      pageLimit: FormValidation.Required,
      projectionExpression: (value) => {
        if (values.useProjectionExpression) {
          if (!value || value.length < 1) {
            return "Projection Expression must be provided (if checked)";
          }
        }
      },
    },
    initialValues: {
      useProjectionExpression: false,
      indexName: table.TableName,
      pageLimit: "20",
      rangeKeyOperator: "=",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Query"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
      navigationTitle={"Query"}
    >
      <Form.Description
        title={"Caution"}
        text={
          "❗Use projection attributes to hide attributes which might cause rendering delays after result is loaded."
        }
      />
      <Form.Dropdown {...itemProps.indexName} title={"Table"} info={"Select main table of one of GSI or LSI"}>
        <Form.Dropdown.Item
          value={`${table.TableName}`}
          title={`${table.TableName}`}
          icon={{ source: Icon.Waveform, tintColor: Color.Blue }}
        />
        {(table.GlobalSecondaryIndexes || []).map((gsi) => (
          <Form.Dropdown.Item
            key={gsi.IndexName}
            value={`gsi.${gsi.IndexName}`}
            title={`GSI: ${gsi.IndexName}`}
            icon={{ source: Icon.Waveform, tintColor: Color.Orange }}
          />
        ))}
        {(table.LocalSecondaryIndexes || []).map((lsi) => (
          <Form.Dropdown.Item
            key={lsi.IndexName}
            value={`lsi.${lsi.IndexName}`}
            title={`LSI: ${lsi.IndexName}`}
            icon={{ source: Icon.Waveform, tintColor: Color.Yellow }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.pageLimit} title={"Page Limit"} info={"Number of result items per page"}>
        <Form.Dropdown.Item value="10" title="10" />
        <Form.Dropdown.Item value="20" title="20" />
        <Form.Dropdown.Item value="50" title="50" />
        <Form.Dropdown.Item value="100" title="100" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        {...itemProps.hashKey}
        placeholder="hash key for item..."
        title={table.keys[values.indexName].hashKey.name}
      />
      {table.keys[values.indexName].rangeKey && (
        <Form.Dropdown {...itemProps.rangeKeyOperator} title={"Sort Key"}>
          <Form.Dropdown.Item value="=" title="Equal To" icon={Icon.PlusMinusDivideMultiply} />
          <Form.Dropdown.Item value=">" title="Greater Than" icon={Icon.PlusMinusDivideMultiply} />
          <Form.Dropdown.Item value="<" title="Less Than" icon={Icon.PlusMinusDivideMultiply} />
          <Form.Dropdown.Item value=">=" title="Greater Than or Equal To" icon={Icon.PlusMinusDivideMultiply} />
          <Form.Dropdown.Item value="<=" title="Less Than or Equal To" icon={Icon.PlusMinusDivideMultiply} />
          <Form.Dropdown.Item value="between" title="Between" icon={Icon.PlusMinusDivideMultiply} />
          <Form.Dropdown.Item value="beginsWith" title="Begins With" icon={Icon.PlusMinusDivideMultiply} />
        </Form.Dropdown>
      )}
      {table.keys[values.indexName].rangeKey && (
        <Form.TextField
          {...itemProps.rangeKey}
          placeholder={
            values.rangeKeyOperator === "between"
              ? "sort key start value"
              : values.rangeKeyOperator === "beginsWith"
                ? "sort key prefix"
                : "sort key value"
          }
          title={`${table.keys[values.indexName].rangeKey!.name} ${values.rangeKeyOperator === "between" ? "start" : values.rangeKeyOperator === "beginsWith" ? "prefix" : values.rangeKeyOperator}`}
        />
      )}
      {table.keys[values.indexName].rangeKey && values.rangeKeyOperator === "between" && (
        <Form.TextField
          title={`${table.keys[values.indexName].rangeKey!.name} end`}
          {...itemProps.rangeKeyEnd}
          placeholder="sort key end value"
        />
      )}
      <Form.Checkbox {...itemProps.useProjectionExpression} label="Use Projection Expression" />
      {values.useProjectionExpression && (
        <Form.TextArea
          {...itemProps.projectionExpression}
          placeholder="hashKey, sortKey, name, attr1, attr2, attr3"
          title="Projection Expression"
        />
      )}
    </Form>
  );
};

const QueryResult = ({
  table,
  input,
  client,
  previousConsumedCapacity,
  previousItemsCount,
  push,
}: {
  table: Table;
  input: QueryCommandInput;
  client: DynamoDBClient;
  previousConsumedCapacity: number;
  previousItemsCount: number;
  push: (component: React.ReactNode) => void;
}) => {
  const {
    isLoading,
    data: queryOutput,
    error,
  } = usePromise(
    async (client, input) => {
      await showToast({ style: Toast.Style.Animated, title: `Querying table ${table.TableName}…` });
      try {
        const output = await client.send(new QueryCommand(input));
        if ((output.Items || []).length > 0) {
          await showToast({
            style: Toast.Style.Success,
            title: `✅ Queried table ${table.TableName}`,
            message: `Consumed capacity: ${output.ConsumedCapacity?.CapacityUnits}`,
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: `❌ Queried table ${table.TableName}`,
            message: "No items found",
          });
        }
        return output;
      } catch (error) {
        await showFailureToast(error, { title: `Failed to query table ${table.TableName}` });
        throw error;
      }
    },
    [client, input],
  );
  const nextPageAvailable = !!queryOutput?.LastEvaluatedKey;
  const totalConsumedCapacity = previousConsumedCapacity + (queryOutput?.ConsumedCapacity?.CapacityUnits ?? 0);
  const totalItemsCount = previousItemsCount + (queryOutput?.Count ?? 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output: Record<string, any>[] = (queryOutput?.Items || []).map((i: any) => sortRecord(unmarshall(i))) ?? [];
  const quote =
    "_Use projection attributes to hide attributes which might cause rendering delays after result is loaded._";
  const markdown = `**Table Name:** ${input.TableName}\n\n**Items (${queryOutput?.Count})**\n\n\`\`\`json\n${JSON.stringify(output, undefined, 2)}\n\`\`\``;
  if (!isLoading && (output || []).length < 1) {
    return (
      <List isLoading={isLoading} navigationTitle={"Query Result"}>
        <List.EmptyView
          title={`No items found in table ${table.TableName}!`}
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        />
      </List>
    );
  }
  if (!isLoading && error) {
    return (
      <List isLoading={isLoading} navigationTitle={"Query Result"}>
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      </List>
    );
  }
  return (
    <Detail
      markdown={isLoading ? undefined : `> ${quote}\n\n${markdown}`}
      isLoading={isLoading}
      navigationTitle={"Query Result"}
      metadata={
        isLoading ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Table Name" text={input.TableName} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Total Consumed Capacity Units"
              text={String(totalConsumedCapacity)}
              icon={{ source: Icon.Footprints, tintColor: Color.Yellow }}
            />
            <Detail.Metadata.Label
              title="Total Items Loaded"
              text={String(totalItemsCount)}
              icon={{ source: Icon.List, tintColor: Color.Blue }}
            />
            <Detail.Metadata.Label
              title="Next Page Available"
              icon={
                nextPageAvailable
                  ? { source: Icon.CheckRosette, tintColor: Color.Green }
                  : { source: Icon.XMarkCircle, tintColor: Color.Red }
              }
            />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={markdown} />
          {nextPageAvailable ? (
            <Action
              title="Load Next Page"
              onAction={async () =>
                push(
                  <QueryResult
                    table={table}
                    client={client}
                    input={{ ...input, ExclusiveStartKey: queryOutput.LastEvaluatedKey }}
                    previousConsumedCapacity={totalConsumedCapacity}
                    previousItemsCount={totalItemsCount}
                    push={push}
                  />,
                )
              }
              icon={Icon.Forward}
            />
          ) : undefined}
        </ActionPanel>
      }
    />
  );
};
