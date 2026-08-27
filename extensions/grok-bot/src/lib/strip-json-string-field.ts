type Container = "object" | "array";

export type SkippedFieldSink<T> = {
  write: (unescaped: string) => void;
  abort: () => void;
  end: () => T | null;
};

type JsonStringFieldSkipper = {
  push: (chunk: string) => void;
  sawList: () => boolean;
  complete: () => boolean;
};

function unescapeJsonChar(character: string): string | null {
  switch (character) {
    case '"':
    case "\\":
    case "/":
      return character;
    case "n":
      return "\n";
    case "r":
      return "\r";
    case "t":
      return "\t";
    default:
      return null;
  }
}

export function createJsonStringFieldSkipper<T>(
  field: string,
  onObject: (json: string, skipped: T | null) => void,
  createSink?: () => SkippedFieldSink<T>,
): JsonStringFieldSkipper {
  const stack: Container[] = [];
  let mode: "copy" | "in_string" = "copy";
  let escaped = false;
  let expectKey = false;
  let readingKey = false;
  let skipString = false;
  let lastKey = "";
  let keyBuffer = "";
  let itemBuffer = "";
  let buffering = false;
  let inAgentsArray = false;
  let sawAgentList = false;
  let sink: SkippedFieldSink<T> | null = null;
  let captured: T | null = null;

  function top(): Container | undefined {
    return stack[stack.length - 1];
  }

  function willBeAgentObject(): boolean {
    if (stack.length === 1 && stack[0] === "array") {
      return true;
    }
    return stack.length === 2 && stack[0] === "object" && stack[1] === "array" && inAgentsArray;
  }

  function isAgentObject(): boolean {
    if (stack.length === 2 && stack[0] === "array" && stack[1] === "object") {
      return true;
    }
    return (
      stack.length === 3 && stack[0] === "object" && stack[1] === "array" && stack[2] === "object" && inAgentsArray
    );
  }

  function append(character: string): void {
    if (buffering) {
      itemBuffer += character;
    }
  }

  function finishSkip(): void {
    mode = "copy";
    skipString = false;
    lastKey = "";
    captured = sink?.end() ?? null;
    sink = null;
  }

  function consumeSkippedString(chunk: string, start: number): number {
    let index = start;
    while (index < chunk.length) {
      if (escaped) {
        const character = chunk[index];
        if (character === undefined) {
          break;
        }
        const unescaped = unescapeJsonChar(character);
        if (unescaped === null) {
          sink?.abort();
        } else {
          sink?.write(unescaped);
        }
        escaped = false;
        index += 1;
        continue;
      }

      const slash = chunk.indexOf("\\", index);
      const quote = chunk.indexOf('"', index);
      let special = -1;
      if (slash === -1) {
        special = quote;
      } else if (quote === -1) {
        special = slash;
      } else {
        special = Math.min(slash, quote);
      }

      if (special === -1) {
        sink?.write(chunk.slice(index));
        return chunk.length;
      }
      if (special > index) {
        sink?.write(chunk.slice(index, special));
      }
      if (chunk[special] === "\\") {
        escaped = true;
        index = special + 1;
        continue;
      }
      finishSkip();
      return special + 1;
    }
    return index;
  }

  function push(chunk: string): void {
    let index = 0;
    while (index < chunk.length) {
      if (mode === "in_string" && skipString) {
        index = consumeSkippedString(chunk, index);
        continue;
      }

      const character = chunk[index];
      if (character === undefined) {
        break;
      }

      if (mode === "in_string") {
        append(character);
        if (escaped) {
          escaped = false;
          if (readingKey) {
            keyBuffer += character;
          }
          index += 1;
          continue;
        }
        if (character === "\\") {
          escaped = true;
          index += 1;
          continue;
        }
        if (character === '"') {
          mode = "copy";
          if (readingKey) {
            lastKey = keyBuffer;
            keyBuffer = "";
            readingKey = false;
            expectKey = false;
          } else {
            lastKey = "";
          }
        } else if (readingKey) {
          keyBuffer += character;
        }
        index += 1;
        continue;
      }

      if (character === '"') {
        const thisIsKey = expectKey && top() === "object";
        if (!thisIsKey && lastKey === field) {
          append("null");
          mode = "in_string";
          skipString = true;
          sink = createSink?.() ?? null;
          captured = null;
          index += 1;
          continue;
        }
        append(character);
        mode = "in_string";
        readingKey = thisIsKey;
        if (readingKey) {
          keyBuffer = "";
        }
        index += 1;
        continue;
      }

      if (character === "{") {
        const startAgent = willBeAgentObject();
        stack.push("object");
        expectKey = true;
        lastKey = "";
        if (startAgent) {
          buffering = true;
          itemBuffer = "{";
          captured = null;
        } else {
          append("{");
        }
        index += 1;
        continue;
      }

      if (character === "[") {
        if (stack.length === 1 && stack[0] === "object" && lastKey === "agents") {
          inAgentsArray = true;
          sawAgentList = true;
        }
        stack.push("array");
        if (stack.length === 1) {
          sawAgentList = true;
        }
        expectKey = false;
        lastKey = "";
        append("[");
        index += 1;
        continue;
      }

      if (character === "}" || character === "]") {
        const closingAgent = character === "}" && isAgentObject();
        append(character);
        stack.pop();
        expectKey = false;
        lastKey = "";
        if (closingAgent) {
          onObject(itemBuffer, captured);
          itemBuffer = "";
          buffering = false;
          captured = null;
        }
        if (character === "]" && inAgentsArray && stack.length === 1 && stack[0] === "object") {
          inAgentsArray = false;
        }
        index += 1;
        continue;
      }

      append(character);

      if (character === ",") {
        expectKey = top() === "object";
        lastKey = "";
      } else if (character === ":") {
        expectKey = false;
      }
      index += 1;
    }
  }

  return {
    push,
    sawList: () => sawAgentList,
    complete: () => stack.length === 0 && mode === "copy" && !skipString,
  };
}

export async function streamJsonObjectsSkippingField<T>(
  stream: ReadableStream<Uint8Array>,
  field: string,
  onObject: (json: string, skipped: T | null) => void,
  options?: {
    createSink?: () => SkippedFieldSink<T>;
    afterChunk?: () => Promise<void>;
  },
): Promise<{ sawList: boolean; complete: boolean }> {
  const skipper = createJsonStringFieldSkipper(field, onObject, options?.createSink);
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        skipper.push(decoder.decode());
        await options?.afterChunk?.();
        break;
      }
      skipper.push(decoder.decode(value, { stream: true }));
      await options?.afterChunk?.();
    }
  } finally {
    reader.releaseLock();
  }
  return { sawList: skipper.sawList(), complete: skipper.complete() };
}
