import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  hostname?: string;
  port?: string;
  token?: string;
  topicDetailStyle: string;
}
export enum TopicDetailStyle {
  "V2EX" = "1",
  "Raycast" = "2",
}
const getProxy = () => {
  const { hostname, port } = getPreferenceValues<Preferences>();
  if (hostname && port) {
    return {
      host: hostname,
      port: Number(port),
    };
  }
  return false;
};
const getToken = () => {
  const { token } = getPreferenceValues<Preferences>();
  return token;
};
const hasToken = () => {
  const token = getToken();
  return !!token;
};
const getTopicDetailStyle = () => {
  const { topicDetailStyle } = getPreferenceValues<Preferences>();
  return topicDetailStyle;
};

export { getProxy, hasToken, getToken, getTopicDetailStyle };
