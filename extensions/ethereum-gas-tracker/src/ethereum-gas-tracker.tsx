import { getPreferenceValues, MenuBarExtra, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Response = {
  low: number;
  average: number;
  high: number;
};

export default function Command() {
  const { hideIcon, hideUnit } = getPreferenceValues();

  const { data, isLoading } = useFetch<Response>("https://api.0x3.studio/gas");

  const title = data && `${data.average}${hideUnit ? "" : " Gwei"}`;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={hideIcon ? undefined : { source: { light: "icon-dark.png", dark: "icon-light.png" } }}
      title={title}
    >
      {data && (
        <>
          <MenuBarExtra.Item icon="🐢" title={`${data.low} Gwei (< 10 min)`} onAction={() => null} />
          <MenuBarExtra.Item icon="🐕" title={`${data.average} Gwei (< 3 min)`} onAction={() => null} />
          <MenuBarExtra.Item icon="🐆" title={`${data.high} Gwei (< 30 sec)`} onAction={() => null} />
        </>
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Open with..." />
      <MenuBarExtra.Item title="Etherscan" onAction={() => open("https://etherscan.io/gastracker")} />
    </MenuBarExtra>
  );
}
