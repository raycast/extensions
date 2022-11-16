import { ActionPanel, List, Detail, Action, confirmAlert, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import chunk from "lodash/chunk";
import AWS from "aws-sdk";
import setupAws from "./util/setupAws";

const preferences = setupAws();
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

export default function ListSQSQueues() {
  const { data: queues, error, isLoading } = useCachedPromise(fetchQueues);
  const { data: attributes, revalidate: revalidateAttributes } = useCachedPromise(fetchQueueAttributes, queues || []);

  if (error) {
    return (
      <Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter queues by name...">
      {queues?.map((i, k) => (
        <QueueListItem key={k} queue={i} attributes={attributes?.[i]} onPurge={revalidateAttributes} />
      ))}
    </List>
  );
}

function QueueListItem(props: { queue: string; attributes: QueueAttributes | undefined; onPurge: VoidFunction }) {
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
            await sqs.purgeQueue({ QueueUrl: queue }).promise();
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
    preferences.region +
    ".console.aws.amazon.com/sqs/v2/home?region=" +
    preferences.region +
    "#/queues/" +
    encodeURIComponent(queue);

  return (
    <List.Item
      id={queue}
      key={queue}
      title={displayName ?? ""}
      icon="sqs-list-icon.png"
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
  const { NextToken, QueueUrls } = await sqs.listQueues({ NextToken: token }).promise();
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
        const { Attributes } = await sqs
          .getQueueAttributes({
            QueueUrl: queueUrl,
            AttributeNames: [
              "ApproximateNumberOfMessages",
              "ApproximateNumberOfMessagesNotVisible",
              "CreatedTimestamp",
            ],
          })
          .promise();

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
