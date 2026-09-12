import { getPreferenceValues, List } from "@raycast/api";

export function makeListDetail(title: string, detail?: string, isDate = false) {
  let data: string;
  if (detail == undefined) {
    data = "-";
  } else {
    data = detail;
    if (isDate) {
      const date = new Date(data);
      data = date.toLocaleTimeString(
        {} as Intl.LocalesArgument,
        { hour: "2-digit", minute: "2-digit" } as Intl.DateTimeFormatOptions
      );
    }
  }
  return <List.Item.Detail.Metadata.Label title={title} text={data} />;
}

interface Preferences {
  ApiToken: string;
}

export function getAPIKey(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.ApiToken;
}
