import variant from "@jitl/quickjs-singlefile-browser-release-sync";
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core";
import { parse } from "lossless-json";
import { formatJson, hasUnsafeNumbers, JsonValue, MAX_INPUT_BYTES } from "./json";

let modulePromise: ReturnType<typeof newQuickJSWASMModuleFromVariant> | undefined;

export async function transform(value: JsonValue, expression: string, timeoutMs = 800): Promise<JsonValue> {
  const text = expression.trim();
  if (!text || text === "this") return value;
  if (text.length > 10_000) throw new Error("The expression exceeds 10,000 characters.");
  if (hasUnsafeNumbers(value))
    throw new Error(
      "This input contains numbers JavaScript cannot represent exactly. Preview preserves them; convert these fields to strings before filtering.",
    );
  modulePromise ??= newQuickJSWASMModuleFromVariant(variant);
  const engine = await modulePromise;
  const runtime = engine.newRuntime();
  runtime.setMemoryLimit(64 * 1024 * 1024);
  runtime.setMaxStackSize(1024 * 1024);
  const deadline = Date.now() + timeoutMs;
  runtime.setInterruptHandler(() => Date.now() > deadline);
  const context = runtime.newContext();
  // Accept both complete expressions and the uTools-style suffix following its fixed `this` label.
  const bracketPath = /^\[\s*(?:\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\](?:[.[]|$)/.test(text);
  const body = text.startsWith(";") ? text.slice(1).trim() : text.startsWith(".") || bracketPath ? `this${text}` : text;
  try {
    const data = context.newString(formatJson(value, 0));
    context.setProp(context.global, "__input", data);
    data.dispose();
    const code = `(() => {
      const input = JSON.parse(__input);
      const result = (function () { "use strict"; return (${body}\n); }).call(input);
      if (result === undefined) throw new Error("The expression returned undefined. Return a valid JSON value.");
      if (result && typeof result.then === "function") throw new Error("Only synchronous expressions are supported.");
      return JSON.stringify(result, function (key, v) {
        if (typeof v === "number" && !Number.isFinite(v)) throw new Error("The result contains NaN or Infinity.");
        if (typeof v === "undefined" || typeof v === "function" || typeof v === "symbol" || typeof v === "bigint") throw new Error("The result contains a value that cannot be represented as JSON.");
        return v;
      });
    })()`;
    const result = context.evalCode(code);
    if (result.error) {
      const error = context.dump(result.error) as { message?: string };
      result.error.dispose();
      throw new Error(
        error?.message === "interrupted"
          ? "The expression timed out. Reduce the input or simplify the expression."
          : error?.message || "The expression failed.",
      );
    }
    let output: string;
    try {
      output = context.getString(result.value);
    } finally {
      result.value.dispose();
    }
    if (new TextEncoder().encode(output).length > MAX_INPUT_BYTES)
      throw new Error("The expression result exceeds 8 MiB.");
    return parse(output) as JsonValue;
  } finally {
    context.dispose();
    runtime.dispose();
  }
}
