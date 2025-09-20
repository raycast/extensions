/*
 * @author: tisfeng
 * @createTime: 2023-03-14 21:55
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-28 11:10
 * @fileName: utils.ts
 *
 * Copyright (c) 2023 by ${git_name}, All Rights Reserved.
 */

import { createParser } from "eventsource-parser";
import fetch, { RequestInit } from "node-fetch";

// Ref: https://github.com/douo/raycast-openai-translator/blob/main/src/providers/openai/utils.ts
interface FetchSSEOptions extends RequestInit {
  onMessage(data: string): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError(error: any): void;
}

export async function fetchSSE(input: string, options: FetchSSEOptions) {
  const { onMessage, onError, ...fetchOptions } = options;
  try {
    const resp = await fetch(input, fetchOptions);
    if (resp.status !== 200) {
      onError(await resp.json());
      return;
    }
    const parser = createParser({
      onEvent: (event) => {
        onMessage(event.data);
      },
    });
    if (resp.body) {
      for await (const chunk of resp.body) {
        if (chunk) {
          const str = new TextDecoder().decode(chunk as ArrayBuffer);
          parser.feed(str);
        }
      }
    }
  } catch (error) {
    onError(error);
  }
}
