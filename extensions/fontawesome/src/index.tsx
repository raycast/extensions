import { useState } from "react";
import { Color, Grid } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useAccessToken } from "@/hooks/useAccessToken";
import { useData } from "@/hooks/useData";
import { useKits } from "@/hooks/useKits";
import { usePreferences } from "@/hooks/usePreferences";
import { IconActions } from "@/components/IconActions";
import { StyleSelector } from "@/components/StyleSelector";

export default function Command() {
  const { API_TOKEN, STYLE_PREFERENCE, account, kitFilter, rememberLastKit } = usePreferences();

  const [lastType, setLastType] = useCachedState<string | undefined>("lastType", undefined);
  const initialType = rememberLastKit && lastType ? lastType : STYLE_PREFERENCE;
  const [type, setType] = useState<string>(initialType);
  const [query, setQuery] = useState<string>("");

  const { accessToken, isLoading: isAccessTokenLoading, executeDataLoading } = useAccessToken(API_TOKEN);
  const { isLoading: isDataLoading, data } = useData(accessToken, executeDataLoading, query, type);
  const { kits, isLoading: isKitsLoading } = useKits(accessToken, executeDataLoading && account === "pro", kitFilter);

  return (
    <Grid
      isLoading={isAccessTokenLoading || isDataLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      inset={Grid.Inset.Large}
      columns={8}
      throttle={true}
      filtering={false}
      searchBarPlaceholder="Search icons..."
      searchBarAccessory={
        <StyleSelector
          setType={(newType) => {
            setType(newType);
            if (rememberLastKit) {
              setLastType(newType);
            }
          }}
          STYLE_PREFERENCE={type}
          account={account}
          kits={kits}
          isKitsLoading={isKitsLoading}
        />
      }
    >
      {data.map((searchItem) => (
        <Grid.Item
          title={searchItem.id}
          key={searchItem.id}
          actions={<IconActions searchItem={searchItem} />}
          content={{
            value: {
              source: `data:image/svg+xml;base64,${Buffer.from(searchItem.svgs[0].html).toString("base64")}`,
              tintColor: Color.PrimaryText,
            },
            tooltip: searchItem.id,
          }}
        />
      ))}
    </Grid>
  );
}
