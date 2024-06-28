import { PurgeQueueCommand, QueueAttributeName, SQSClient } from "@aws-sdk/client-sqs";
import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { getErrorMessage, resourceToConsoleLink, uniqBy } from "./util";
import { AwsAction } from "./components/common/action";
import { SendMessageForm } from "./components/sqs/send-message-form";
import { useQueues } from "./hooks/use-sqs";
import { useState } from "react";

export interface Queue {
  queueUrl: string;
  queueKey: string;
  attributes?: Partial<Record<QueueAttributeName, string>>;
}

export default function SQS() {
  const [prefixQuery, setPrefixQuery] = useState<string>("");
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "aws-sqs",
  });
  const { queues, error, isLoading, revalidate, pagination } = useQueues(prefixQuery);

  return (
    <List
      isLoading={isLoading}
      filtering
      throttle
      pagination={pagination}
      onSearchTextChange={setPrefixQuery}
      isShowingDetail={!isLoading && !error && (queues || []).length > 0 && isDetailsEnabled}
      searchBarPlaceholder="Search queues by name prefix (>2 characters)..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && queues?.length === 0 && (
        <List.EmptyView title="No queues found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {uniqBy(queues || [], (queue) => queue.queueUrl)
        .sort((a, b) => a.queueUrl.localeCompare(b.queueUrl))
        .map((queue) => (
          <List.Item
            key={queue.queueKey}
            title={queue.attributes?.QueueArn?.split(":").pop() || ""}
            icon={"aws-icons/sqs/queue.png"}
            detail={
              <List.Item.Detail
                markdown={
                  queue.attributes?.Policy
                    ? `**Policy:**\n \`\`\`json\n${JSON.stringify(JSON.parse(queue.attributes.Policy), undefined, 4)}\n\`\`\``
                    : undefined
                }
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link
                      title="URL"
                      text={queue.queueUrl}
                      target={resourceToConsoleLink(queue.queueUrl, "AWS::SQS::Queue")}
                    />
                    <List.Item.Detail.Metadata.Label title="ARN" text={queue.attributes?.QueueArn} />
                    {queue.attributes?.FifoQueue && (
                      <List.Item.Detail.Metadata.TagList title={"FIFO"}>
                        {queue.attributes?.ContentBasedDeduplication && (
                          <List.Item.Detail.Metadata.TagList.Item
                            text="Content Based Deduplication"
                            icon={queue.attributes?.ContentBasedDeduplication === "true" ? Icon.Checkmark : Icon.Xmark}
                            color={queue.attributes?.ContentBasedDeduplication === "true" ? Color.Green : Color.Red}
                          />
                        )}
                        {queue.attributes?.DeduplicationScope && (
                          <List.Item.Detail.Metadata.TagList.Item
                            text={`Scope: ${queue.attributes.DeduplicationScope}`}
                            color={Color.Orange}
                          />
                        )}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    {queue.attributes?.ApproximateNumberOfMessages && (
                      <List.Item.Detail.Metadata.Label
                        title="# Approx Msgs"
                        text={queue.attributes?.ApproximateNumberOfMessages}
                      />
                    )}
                    {queue.attributes?.ApproximateNumberOfMessagesDelayed && (
                      <List.Item.Detail.Metadata.Label
                        title="# Approx Msgs Delayed"
                        text={queue.attributes?.ApproximateNumberOfMessagesDelayed}
                      />
                    )}
                    {queue.attributes?.ApproximateNumberOfMessagesNotVisible && (
                      <List.Item.Detail.Metadata.Label
                        title="# Approx Msgs Not Visible"
                        text={queue.attributes?.ApproximateNumberOfMessagesNotVisible}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    {queue.attributes?.VisibilityTimeout && (
                      <List.Item.Detail.Metadata.Label
                        title="Visibility Timeout"
                        text={queue.attributes?.VisibilityTimeout}
                      />
                    )}
                    {queue.attributes?.DelaySeconds && (
                      <List.Item.Detail.Metadata.Label title="Delay Seconds" text={queue.attributes?.DelaySeconds} />
                    )}
                    {queue.attributes?.MaximumMessageSize && (
                      <List.Item.Detail.Metadata.Label
                        title="Maximum Msg Size"
                        text={queue.attributes?.MaximumMessageSize}
                      />
                    )}
                    {queue.attributes?.MessageRetentionPeriod && (
                      <List.Item.Detail.Metadata.Label
                        title="Retention Period"
                        text={queue.attributes?.MessageRetentionPeriod}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Creation Time" text={queue.attributes?.CreatedTimestamp} />
                    {queue.attributes?.LastModifiedTimestamp && (
                      <List.Item.Detail.Metadata.Label
                        title="Last Modified Time"
                        text={queue.attributes?.LastModifiedTimestamp}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <AwsAction.Console url={resourceToConsoleLink(queue.queueUrl, "AWS::SQS::Queue")} />
                <ActionPanel.Section title={"Queue Actions"}>
                  <Action.CopyToClipboard title="Copy Queue URL" content={queue.queueUrl} />
                  <Action.Push
                    target={<SendMessageForm queue={queue} revalidate={revalidate} />}
                    title="Send Message"
                    icon={Icon.Message}
                    shortcut={{ modifiers: ["ctrl"], key: "m" }}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Purge Queue"
                    shortcut={{ modifiers: ["ctrl"], key: "p" }}
                    onAction={() => purgeQueue(queue, revalidate)}
                  />
                  <Action
                    title={`${isDetailsEnabled ? "Hide" : "Show"} Details`}
                    onAction={() => setDetailsEnabled(!isDetailsEnabled)}
                    icon={isDetailsEnabled ? Icon.EyeDisabled : Icon.Eye}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            accessories={[
              {
                date: new Date(Number(queue.attributes?.CreatedTimestamp + "000")),
                tooltip: "Creation Time",
                icon: Icon.Calendar,
              },
              {
                tag: { value: queue.attributes?.ApproximateNumberOfMessages, color: Color.Magenta },
                icon: Icon.Message,
                tooltip: "Messages available",
              },
            ]}
          />
        ))}
    </List>
  );
}

const purgeQueue = async (queue: Queue, revalidate: () => void) =>
  await confirmAlert({
    icon: { source: Icon.Trash, tintColor: Color.Red },
    title: "Are you sure you want to purge the queue?",
    message: "This action cannot be undone.",
    primaryAction: {
      title: "Purge",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "🗑️ Purging queue..." });
        new SQSClient({})
          .send(new PurgeQueueCommand({ QueueUrl: queue.queueUrl }))
          .then(() => {
            toast.style = Toast.Style.Success;
            toast.title = "✅ Queue purged";
          })
          .catch((err) => {
            captureException(err);
            toast.style = Toast.Style.Failure;
            toast.title = "❌ Failed to purge queue";
            toast.message = getErrorMessage(err);
            toast.primaryAction = {
              title: "Retry",
              shortcut: { modifiers: ["cmd"], key: "r" },
              onAction: () => purgeQueue(queue, revalidate),
            };
            toast.secondaryAction = {
              title: "Copy Error",
              shortcut: { modifiers: ["cmd"], key: "c" },
              onAction: () => Clipboard.copy(getErrorMessage(err)),
            };
          })
          .finally(revalidate);
      },
    },
  });
