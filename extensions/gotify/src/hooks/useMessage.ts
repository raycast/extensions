import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { z } from "zod";

export const Message = z.object({
  id: z.number(),
  appid: z.number(),
  message: z.string(),
  title: z.string(),
  priority: z.number(),
  date: z.string().datetime(),
  extras: z
    .object({
      "metadata::type": z.string(),
      "client::notification": z
        .object({
          click: z.object({
            url: z.string(),
          }),
          bigImageUrl: z.string(),
        })
        .partial(),
    })
    .partial()
    .optional(),
});

export const MessageRes = z.object({
  messages: z.array(Message),
  paging: z.object({
    limit: z.number(),
    since: z.number(),
    size: z.number(),
  }),
});

export function useMessage(props?: { id: string }) {
  const { token, endpoint } = getPreferenceValues<Preferences.Messages>();
  let url = `${endpoint}/message`;
  if (props?.id && props.id.toLowerCase() !== "all") {
    url = `${endpoint}/application/${props.id}/message`;
  }
  const headers = {
    "X-Gotify-Key": token,
  };

  const { data, isLoading, pagination, mutate, revalidate } = useFetch<
    z.infer<typeof MessageRes>,
    undefined,
    z.infer<typeof Message>[]
  >(
    (options) => {
      let since = 0;
      if (options.lastItem) {
        since = options.lastItem.id;
      }
      return `${url}?since=${since}`;
    },
    {
      headers,
      mapResult: (result) => {
        return {
          data: result.messages,
          hasMore: result.paging.limit > 0 && result.paging.size >= result.paging.limit,
        };
      },
    },
  );

  const deleteMessage = async (id: number) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Delete Message" });
    try {
      await mutate(
        fetch(`${endpoint}/message/${id}`, {
          headers,
          method: "DELETE",
        }),
        {
          shouldRevalidateAfter: true,
        },
      );
      toast.style = Toast.Style.Success;
      toast.message = "Message deleted";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete message";
      toast.message = (err as Error).message;
    }
  };

  return {
    messages: data,
    messageLoading: isLoading,
    messagePagination: pagination,
    revalidate,
    deleteMessage,
  };
}
