import { createElement, useContext, createContext } from "react";

const NavigationContext = createContext({ pop() {} });
export const useNavigation = () => useContext(NavigationContext);
export const closeMainWindow = async () => {};
export const ActionPanel = ({ children }: { children: React.ReactNode }) => createElement("actions", {}, children);
export const Action = Object.assign((props: object) => createElement("action", props), {
  Open: (props: object) => createElement("open", props),
  Style: { Destructive: "destructive" },
});
export const List = Object.assign(
  ({ children, ...props }: { children: React.ReactNode }) => createElement("list", props, children),
  { Item: (props: object) => createElement("item", props) },
);
export const Color = { Green: "green", SecondaryText: "secondary" };
export const Icon = {
  Power: "power",
  XMarkCircle: "x",
  Folder: "folder",
  Mobile: "mobile",
  Desktop: "desktop",
  Devices: "devices",
};
