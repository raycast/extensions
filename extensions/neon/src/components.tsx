import { Action, Keyboard } from "@raycast/api";
export const OpenInNeon = ({ title, route }: { route: string; title?: string }) => (
  <Action.OpenInBrowser
    icon="neon.png"
    title={title}
    url={`https://console.neon.tech/app/${route}`}
    shortcut={Keyboard.Shortcut.Common.Open}
  />
);
