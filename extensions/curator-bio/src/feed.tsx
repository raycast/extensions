import { Action, ActionPanel, Form, Grid, List } from "@raycast/api";
import { useState } from "react";
import { useMe, useSubscriptions } from "../lib/hooks";

export default function Login() {
  const { isLoading: isLogging, data: userResponse, error } = useMe();
  const [page, setPage] = useState(1);

  const fetchSubscriptions = !error && !!userResponse;

  const { isLoading, data: { data = [] } = {} } = useSubscriptions(page, fetchSubscriptions);

  const isListLoading = isLoading || isLogging;

  console.log(data);

  return (
    <Grid isLoading={isListLoading}>
      {data.map((item: any) => {
        const link = item.settings?.link?.enabled ? item.settings?.link?.value : null;

        return (
          <Grid.Item
            key={item.id}
            content={{
              source: item.cover,
            }}
            title={item.title}
            subtitle={item.subtitle}
            actions={<ActionPanel>{link && <Action.OpenInBrowser title="Open in Browser" url={link} />}</ActionPanel>}
          />
        );
      })}
    </Grid>
  );
}
