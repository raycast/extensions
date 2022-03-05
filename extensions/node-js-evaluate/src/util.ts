import { State } from "./types";

export function doEval(state: State, long = false): State {
  const newState = { ...state };
  const query = state.query.trim() ?? "";
  let result;

  try {
    try {
      result = JSON.parse(query);
    } catch (_) {
      result = eval(query);
    }
    newState.type = toType(result);
  } catch (err) {
    newState.type = "error";
    result = (err as Error).toString();
  }

  newState.result = JSON.stringify(result, null, long ? 2 : undefined) ?? result?.toString();
  return newState;
}

export function toType(obj: unknown): string {
  return (
    {}.toString
      .call(obj)
      .match(/\s([a-zA-Z]+)/)?.[1]
      .toLowerCase() ?? "undefined"
  );
}
