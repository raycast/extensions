import { MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchBarometer } from "./barometer";

export default function Command() {
  const { data, error, isLoading } = usePromise(fetchBarometer);
  if (error)
    return (
      <MenuBarExtra title="!" tooltip={error.message} isLoading={isLoading} />
    );
  return (
    <MenuBarExtra
      title={data ? String(data.score) : undefined}
      isLoading={isLoading}
    >
      {data && (
        <MenuBarExtra.Item
          title={`${data.zone}, ${data.score}/100`}
          onAction={() => open(data.methodologyUrl)}
        />
      )}
    </MenuBarExtra>
  );
}
