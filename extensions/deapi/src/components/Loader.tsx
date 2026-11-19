import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement } from "react";

/** Reads something from the system (like the current selection) before showing a form. */
export function Loader<T>(props: { load: () => Promise<T>; render: (value: T | undefined) => ReactElement }) {
  const { data, isLoading } = usePromise(props.load);
  if (isLoading) return <Detail isLoading markdown="" />;
  return props.render(data);
}
