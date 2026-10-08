import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

export async function ChatStream(resBody: NodeJS.ReadableStream | null) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let isControllerClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (isControllerClosed) {
          return;
        }

        if (event.type === "event") {
          const data = event.data;
          if (data === "[DONE]") {
            controller.close();
            isControllerClosed = true;
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta?.content || "";
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
            isControllerClosed = true;
          }
        }
      }

      const parser = createParser(onParse);

      if (resBody) {
        resBody.on("data", (chunk) => {
          if (!isControllerClosed) {
            parser.feed(decoder.decode(chunk));
          }
        });

        resBody.on("end", () => {
          if (!isControllerClosed) {
            controller.close();
            isControllerClosed = true;
          }
        });

        resBody.on("error", (err) => {
          if (!isControllerClosed) {
            controller.error(err);
            isControllerClosed = true;
          }
        });
      }
    },
  });

  return stream;
}
