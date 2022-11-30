import { GetQueueAttributesCommand, ListQueuesCommand, PurgeQueueCommand, SQSClient } from "@aws-sdk/client-sqs";
import { ActionPanel, List, Action, confirmAlert, Toast, showToast, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./util/aws-profile-dropdown";

export default function SQS() {
  const { data: queues, error, isLoading, revalidate } = useCachedPromise(fetchQueues);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter queues by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        queues?.map((queue) => <SQSQueue key={queue} queue={queue} />)
      )}
    </List>
  );
}

function SQSQueue({ queue }: { queue: string }) {
  const { data: attributes, revalidate } = useCachedPromise(fetchQueueAttributes, [queue]);
  const displayName = (queue.split("/").at(-1) ?? "").replace(/-/g, " ").replace(/\./g, " ");

  const accessories: List.Item.Accessory[] = [
    {
      icon: "📨",
      text: attributes ? attributes.ApproximateNumberOfMessages : "...",
      tooltip: "Approximated Number of Messages",
    },
    {
      icon: "✈️",
      text: attributes ? attributes.ApproximateNumberOfMessagesNotVisible : "...",
      tooltip: "Approximated Number of Messages Not Visible",
    },
    {
      icon: "⏰",
      text: attributes ? new Date(Number.parseInt(attributes.CreatedTimestamp) * 1000).toLocaleDateString() : "...",
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
            revalidate();
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
            title={`Purge Queue (${attributes?.ApproximateNumberOfMessages || "..."})`}
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

async function fetchQueueAttributes(queueUrl: string) {
  const { Attributes } = await new SQSClient({}).send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible", "CreatedTimestamp"],
    })
  );

  return Attributes;
}
