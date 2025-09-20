import { getPreferenceValues, MenuBarExtra, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Result =
  | {
      status: "0";
      message: "NOTOK";
      result: string;
    }
  | {
      status: "1";
      message: "OK";
      result: {
        LastBlock: string;
        SafeGasPrice: string;
        ProposeGasPrice: string;
        FastGasPrice: string;
        suggestBaseFee: string;
        gasUsedRatio: string;
      };
    };

export default function Command() {
  const { apiKey, hideIcon, hideUnit } = getPreferenceValues<Preferences>();

  const { data, isLoading } = useFetch(
    `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`,
    {
      mapResult(res: Result) {
        if (res.status === "0") throw new Error(res.result);
        const { result } = res;
        return {
          data: {
            low: parseInt(result.SafeGasPrice),
            average: parseInt(result.ProposeGasPrice),
            high: parseInt(result.FastGasPrice),
          },
        };
      },
    }
  );

  const title = data && `${data.average}${hideUnit ? "" : " Gwei"}`;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={hideIcon ? undefined : { source: { light: "icon-dark.png", dark: "icon-light.png" } }}
      title={title}
    >
      <MenuBarExtra.Section>
        {data && (
          <>
            <MenuBarExtra.Item icon="🐢" title={`${data.low} Gwei (< 10 min)`} onAction={() => null} />
            <MenuBarExtra.Item icon="🐕" title={`${data.average} Gwei (< 3 min)`} onAction={() => null} />
            <MenuBarExtra.Item icon="🐆" title={`${data.high} Gwei (< 30 sec)`} onAction={() => null} />
          </>
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open with..." />
        <MenuBarExtra.Item title="Etherscan" onAction={() => open("https://etherscan.io/gastracker")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
