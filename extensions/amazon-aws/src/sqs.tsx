import { GetQueueAttributesCommand, ListQueuesCommand, PurgeQueueCommand, SQSClient } from "@aws-sdk/client-sqs";
import { ActionPanel, List, Action, confirmAlert, Toast, showToast, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import chunk from "lodash/chunk";
import AWSProfileDropdown from "./util/aws-profile-dropdown";

export default function SQS() {
  const { data: queues, error, isLoading, revalidate } = useCachedPromise(fetchQueues);
  const { data: attributes, revalidate: revalidateAttributes } = useCachedPromise(fetchQueueAttributes, queues || []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter queues by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        queues?.map((i, k) => (
          <SQSQueue key={k} queue={i} attributes={attributes?.[i]} onPurge={revalidateAttributes} />
        ))
      )}
    </List>
  );
}

function SQSQueue(props: { queue: string; attributes: QueueAttributes | undefined; onPurge: VoidFunction }) {
  const queue = props.queue;
  const attr = props.attributes;
  const displayName = (queue.split("/").at(-1) ?? "").replace(/-/g, " ").replace(/\./g, " ");

  const accessories: List.Item.Accessory[] = [
    {
      icon: "📨",
      text: attr ? attr.ApproximateNumberOfMessages : "...",
      tooltip: "Approximated Number of Messages",
    },
    {
      icon: "✈️",
      text: attr ? attr.ApproximateNumberOfMessagesNotVisible : "...",
      tooltip: "Approximated Number of Messages Not Visible",
    },
    {
      icon: "⏰",
      text: attr ? new Date(Number.parseInt(attr.CreatedTimestamp) * 1000).toLocaleDateString() : "...",
      tooltip: "Creation Time",
    },
  ];

  function handlePurgeQueueAction() {
    confirmAlert({
      title: "Are you sure you want to purge the queue?",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Purge",
        onAction: async () => {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Purging queue..." });

          try {
            await new SQSClient({}).send(new PurgeQueueCommand({ QueueUrl: queue }));
            toast.style = Toast.Style.Success;
            toast.title = "Purged queue";
          } catch (err) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to purge queue";
          } finally {
            props.onPurge();
          }
        },
      },
    });
  }

  const path =
    "https://" +
    process.env.AWS_REGION +
    ".console.aws.amazon.com/sqs/v2/home?region=" +
    process.env.AWS_REGION +
    "#/queues/" +
    encodeURIComponent(queue);

  return (
    <List.Item
      id={queue}
      key={queue}
      title={displayName ?? ""}
      icon="sqs.png"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" shortcut={{ modifiers: [], key: "enter" }} url={path} />
          <Action.CopyToClipboard title="Copy Path" content={queue} />
          <Action.SubmitForm
            title={`Purge Queue (${attr?.ApproximateNumberOfMessages || "..."})`}
            onSubmit={handlePurgeQueueAction}
          />
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}

async function fetchQueues(token?: string, queues?: string[]): Promise<string[]> {
  const { NextToken, QueueUrls } = await new SQSClient({}).send(new ListQueuesCommand({ NextToken: token }));
  const combinedQueues = [...(queues ?? []), ...(QueueUrls ?? [])];

  if (NextToken) {
    fetchQueues(NextToken, combinedQueues);
  }

  return combinedQueues;
}

async function fetchQueueAttributes(...queueUrls: string[]) {
  const attributesMap: QueueAttributesMap = {};

  const queueUrlBatches = chunk(queueUrls, 15);

  for (const queueUrlBatch of queueUrlBatches) {
    await Promise.all(
      queueUrlBatch.map(async (queueUrl) => {
        const { Attributes } = await new SQSClient({}).send(
          new GetQueueAttributesCommand({
            QueueUrl: queueUrl,
            AttributeNames: [
              "ApproximateNumberOfMessages",
              "ApproximateNumberOfMessagesNotVisible",
              "CreatedTimestamp",
            ],
          })
        );

        attributesMap[queueUrl] = Attributes as unknown as QueueAttributes;
      })
    );
  }

  return attributesMap;
}

interface QueueAttributes {
  ApproximateNumberOfMessages: string;
  ApproximateNumberOfMessagesNotVisible: string;
  CreatedTimestamp: string;
}

interface QueueAttributesMap {
  [url: string]: QueueAttributes;
}
