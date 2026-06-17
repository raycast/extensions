import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import { GetQueueAttributesCommand, ListQueuesCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Queue } from "../sqs";

export const useQueues = (prefixQuery: string) => {
  const {
    data: queues,
    error,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (prefix: string) => {
      const { QueueUrls } = await new SQSClient({}).send(
        new ListQueuesCommand({
          MaxResults: 25,
          ...(prefix.trim().length > 2 && { QueueNamePrefix: prefix }),
        }),
      );

      const queues = await Promise.all(
        (QueueUrls ?? []).map(async (queueUrl) => {
          const { Attributes: attributes } = await new SQSClient({}).send(
            new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ["All"] }),
          );

          return { queueUrl, attributes } as Queue;
        }),
      );

      return queues.filter((q) => !!q && !!q.queueUrl && !!q.attributes && !!q.attributes.QueueArn);
    },
    [prefixQuery],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load queues" } },
  );

  return {
    queues,
    error,
    isLoading: (!queues && !error) || isLoading,
    mutate,
  };
};
