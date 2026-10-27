import { Icon, MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  describeError,
  fetchBarometer,
  formatUsd,
  priceLine,
} from "./barometer";

export default function Command() {
  const { data, error, isLoading } = usePromise(fetchBarometer);
  if (error)
    return (
      <MenuBarExtra
        icon={Icon.ExclamationMark}
        title="!"
        tooltip={describeError(error)}
        isLoading={isLoading}
      />
    );
  return (
    <MenuBarExtra
      icon={{ source: "extension-icon.png" }}
      title={
        data
          ? data.usd && priceLine(data)
            ? formatUsd(data.usd)
            : String(data.score)
          : undefined
      }
      isLoading={isLoading}
    >
      {data && priceLine(data) && (
        <MenuBarExtra.Item title={`Bitcoin ${priceLine(data)}`} />
      )}
      {data && (
        <MenuBarExtra.Item
          title={`${data.zone}, ${data.score}/100`}
          onAction={() => open(data.methodologyUrl)}
        />
      )}
    </MenuBarExtra>
  );
}
