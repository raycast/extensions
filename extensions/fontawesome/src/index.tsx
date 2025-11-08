import { useState } from "react";
import { Color, Grid } from "@raycast/api";
import { useAccessToken } from "@/hooks/useAccessToken";
import { useData } from "@/hooks/useData";
import { usePreferences } from "@/hooks/usePreferences";
import { IconActions } from "@/components/IconActions";
import { StyleSelector } from "@/components/StyleSelector";

export default function Command() {
  const { API_TOKEN, STYLE_PREFERENCE, account } = usePreferences();

  const [type, setType] = useState<string>(STYLE_PREFERENCE);
  const [query, setQuery] = useState<string>("");

  const { accessToken, isLoading: isAccessTokenLoading } = useAccessToken(API_TOKEN);
  const { isLoading: isDataLoading, data } = useData(accessToken, !isAccessTokenLoading, query, type);

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
      searchBarAccessory={<StyleSelector setType={setType} STYLE_PREFERENCE={STYLE_PREFERENCE} account={account} />}
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
