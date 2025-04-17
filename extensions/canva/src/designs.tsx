import { authorize, client } from "./oauth";
import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

interface Design {
  id: string;
  title: string;
  owner: {
    user_id: string;
    team_id: string;
  };
  thumbnail: {
    width: number;
    height: number;
    url: string;
  };
  urls: {
    edit_url: string;
    view_url: string;
  };
  created_at: number;
  updated_at: number;
  page_count: number;
}

export default function Index() {
  const [token, setToken] = useState<string | undefined>();
  useEffect(() => {
    (async () => {
      try {
        await authorize();
        const tokenSet = await client.getTokens();
        setToken(tokenSet?.accessToken);
      } catch (error) {
        await showFailureToast(error, { title: "Failed to authorize with Canva" });
      }
    })();
  }, []);

  const { isLoading, data } = useFetch("https://api.canva.com/rest/v1/designs", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    execute: !!token,
    initialData: [],
    mapResult(result: { items: Design[] }) {
      return {
        data: result.items,
      };
    },
  });

  return (
    <Grid isLoading={isLoading}>
      {data.map((design) => (
        <Grid.Item
          key={design.id}
          content={design.thumbnail?.url}
          title={design.title || ""}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Eye} title="Open View URL" url={design.urls.view_url} />
              <Action.OpenInBrowser icon={Icon.Pencil} title="Open Edit URL" url={design.urls.edit_url} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
