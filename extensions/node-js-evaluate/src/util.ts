import { State } from "./types";

export function doEval(state: State, long = false): State {
  let evalResult, result, type;
  const query = state.query.trim() ?? "";

  try {
    try {
      try {
        evalResult = JSON.parse(query);
      } catch (_) {
        evalResult = eval(`(${query})`);
      }
    } catch (_) {
      evalResult = eval(query);
    }
  } catch (err) {
    type = "error";
    evalResult = (err as Error).toString();
  }

  type ||= toType(evalResult);

  if (!isPrimitive(evalResult as never)) {
    console.log(evalResult);
    result = JSON.stringify(
      evalResult,
      (_, value) => {
        if (isPrimitive(value as never) && JSON.stringify(value) === "null") return value?.toString() ?? value;
        return value;
      },
      long ? 2 : undefined
    );
  }

  result ||= evalResult?.toString() ?? "undefined";
  return { ...state, type, result };
}

function toType(obj: unknown): string {
  return (
    {}.toString
      .call(obj)
      .match(/\s([a-zA-Z]+)/)?.[1]
      .toLowerCase() ?? "undefined"
  );
}

function isPrimitive(test: never) {
  return test !== Object(test);
}
