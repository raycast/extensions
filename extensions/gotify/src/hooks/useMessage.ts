import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { z } from "zod";
import { authHeaders, endpointWithPath } from "../utils";
import { useStream } from "./useStream";
import { useEffect, useState } from "react";

export const Message = z
  .object({
    id: z.number(),
    appid: z.number(),
    message: z.string(),
    title: z.string(),
    priority: z.number(),
    date: z.string().datetime(),
    // https://gotify.net/docs/msgextras
    extras: z
      .object({
        "metadata::type": z.string(),
        "metadata::extract::regex": z.string(),
        "client::display": z.object({
          contentType: z.string(),
        }),
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
    _new: z.boolean().optional(),
    _originalMessage: z.string().optional(),
  })
  .transform((msg) => {
    msg._originalMessage = msg.message;
    if (msg.extras?.["metadata::extract::regex"]) {
      const regex = new RegExp(msg.extras["metadata::extract::regex"]);
      const match = msg.message.match(regex);
      if (match) {
        msg.message = match[0];
      }
    }
    return msg;
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
  try {
    const { token, endpoint } = getPreferenceValues<Preferences.Messages>();
    let url = endpointWithPath(endpoint, "/message");
    if (props?.id && props.id.toLowerCase() !== "all") {
      url = endpointWithPath(url, `/application/${props.id}/message`);
    }

    const { data, isLoading, pagination, mutate, revalidate } = useFetch<
      z.infer<typeof MessageRes>,
      undefined,
      z.infer<typeof Message>[]
    >(
      (options) => {
        const since = options.lastItem?.id ?? 0;
        return `${url.href}?since=${since}`;
      },
      {
        ...authHeaders(token),
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
          fetch(endpointWithPath(endpoint, `/message/${id}`), {
            ...authHeaders(token),
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

    const deleteAll = async () => {
      const path = props?.id && props.id.toLowerCase() !== "all" ? `/application/${props.id}/message` : "/message";
      const toast = await showToast({ style: Toast.Style.Animated, title: "Delete All" });
      try {
        await mutate(
          fetch(endpointWithPath(endpoint, path), {
            ...authHeaders(token),
            method: "DELETE",
          }),
          {
            shouldRevalidateAfter: true,
          },
        );
        toast.style = Toast.Style.Success;
        toast.message = "All messages deleted";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete all messages";
        toast.message = (err as Error).message;
      }
    };

    const { data: stream } = useStream();
    const [messages, setMessages] = useState<z.infer<typeof Message>[] | undefined>([]);

    useEffect(() => {
      setMessages(data);
    }, [data]);

    useEffect(() => {
      setMessages((prev) => {
        let res = [...(prev ?? [])];
        if (stream) {
          res = res.filter((d) => d.id !== stream.id);
          res.push(stream);
        }
        return res.sort((a, b) => {
          return b.id - a.id;
        });
      });
    }, [stream]);

    const handleRead = (id: string | null) => {
      if (id) {
        setMessages((prev) => {
          return prev?.map((d) => {
            if (d.id === Number(id)) {
              d._new = false;
            }
            return d;
          });
        });
      }
    };

    return {
      messages: messages?.map((m) => Message.parse(m)),
      messageLoading: isLoading,
      messagePagination: pagination,
      revalidate,
      deleteMessage,
      deleteAll,
      handleRead,
    };
  } catch (error: unknown) {
    let errorMsg = "";
    if (error instanceof Error) {
      errorMsg = error.message;
    } else {
      errorMsg = String(error);
    }
    return {
      error: errorMsg,
    };
  }
}
