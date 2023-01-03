import { GetQueueAttributesCommand, ListQueuesCommand, PurgeQueueCommand, SQSClient } from "@aws-sdk/client-sqs";
import { ActionPanel, List, Action, confirmAlert, Toast, showToast, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";

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

  return (
    <List.Item
      id={queue}
      key={queue}
      title={queue.slice(queue.lastIndexOf("/") + 1)}
      icon={"aws-icons/sqs.png"}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={resourceToConsoleLink(queue, "AWS::SQS::Queue")} />
          <Action.CopyToClipboard title="Copy Queue URL" content={queue} />
          <Action.CopyToClipboard title="Copy Path" content={queue} />
          <Action icon={Icon.Trash} title="Purge Queue" onAction={handlePurgeQueueAction} />
        </ActionPanel>
      }
      accessories={[
        { text: attributes?.ApproximateNumberOfMessages || "", tooltip: "Messages available" },
        { icon: Icon.Message },
      ]}
    />
  );
}

async function fetchQueues(token?: string, queues?: string[]): Promise<string[]> {
  if (!process.env.AWS_PROFILE) return [];
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
      AttributeNames: ["ApproximateNumberOfMessages"],
    })
  );

  return Attributes;
}
