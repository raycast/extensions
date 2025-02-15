import { Action } from "@raycast/api";
export const OpenInNeon = ({ title, route }: { route: string; title?: string }) => (
  <Action.OpenInBrowser icon="neon.png" title={title} url={`https://console.neon.tech/app/${route}`} />
);
