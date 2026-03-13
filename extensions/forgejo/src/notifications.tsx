import { Action, ActionPanel, Color, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { baseUrl } from "./constants/global.constant";
import { Notification } from "./interfaces/notifications.interface";
import { getLastStr } from "./common/utils";

export default function Command() {
  const { serverUrl, accessToken } = getPreferenceValues<{ serverUrl: string; accessToken: string }>();
  const notifyUrl = serverUrl + baseUrl + `/notifications?token=${accessToken}&limit=20&all=false`;

  const { isLoading, data } = useFetch<Notification[]>(notifyUrl);
  const dataArray = Array.isArray(data) ? data : [];

  return (
    <List isLoading={isLoading} throttle>
      {dataArray.map((item) => {
        item.subject.tabNum = "#" + getLastStr(item.subject.html_url);
        return (
          <List.Item
            key={item.id}
            title={item.subject.title}
            subtitle={item.repository.full_name}
            icon={item.repository.avatar_url}
            accessories={[
              { text: { value: item.subject.type, color: Color.PrimaryText } },
              { text: item.subject.tabNum },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={item.subject.html_url} />
                <Action.OpenInBrowser title="Open Source Repository" url={item.repository.html_url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
