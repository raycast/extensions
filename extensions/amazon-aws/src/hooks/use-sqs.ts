import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import { GetQueueAttributesCommand, ListQueuesCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Queue } from "../sqs";

export const useQueues = (prefixQuery: string) => {
  const {
    data: queues,
    error,
    isLoading,
    revalidate,
    pagination,
  } = useCachedPromise(
    (prefix: string) =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { NextToken, QueueUrls } = await new SQSClient({}).send(
          new ListQueuesCommand({
            NextToken: cursor,
            MaxResults: 100,
            ...(prefix.trim().length > 2 && { QueueNamePrefix: prefix }),
          }),
        );
        const queues = await Promise.all(
          (QueueUrls ?? []).map(async (queueUrl) => {
            const { Attributes: attributes } = await new SQSClient({}).send(
              new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ["All"] }),
            );
            return { queueUrl, attributes, queueKey: `#${page}-${attributes?.QueueArn}` };
          }),
        );

        return { data: queues as Queue[], hasMore: !!NextToken, cursor: NextToken };
      },
    [prefixQuery],
    { execute: isReadyToFetch() },
  );

  return {
    queues,
    error,
    isLoading: (!queues && !error) || isLoading,
    revalidate,
    pagination,
  };
};
