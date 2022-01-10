import { ActionPanel, ImageLike, List, PushAction } from "@raycast/api";
import Commponents from "./components";
import { getCurrentBackendWithSecret } from "./utils";
import { ErrorHandler } from "./utils/error";

type CommponentT = {
  title: string;
  icon?: ImageLike;
  node: JSX.Element;
};

const commponents: Array<CommponentT> = [
  {
    title: "Overview",
    icon: "overview.png",
    node: <Commponents.Overview />,
  },
  {
    title: "Proxies",
    icon: "proxies.png",
    node: <Commponents.Proxies />,
  },
  {
    title: "Rules",
    icon: "rules.png",
    node: <Commponents.Rules />,
  },
  {
    title: "Conns",
    icon: "conns.png",
    node: <Commponents.Conns />,
  },
  {
    title: "Logs",
    icon: "logs.png",
    node: <Commponents.Logs />,
  },
  {
    title: "Backends",
    icon: "backends.png",
    node: <Commponents.Backends />,
  },
];

export default function Command() {
  getCurrentBackendWithSecret().catch(ErrorHandler);
  return (
    <List>
      {commponents.map((commponent, index) => (
        <List.Item
          key={index}
          title={commponent.title}
          icon={commponent.icon}
          actions={
            <ActionPanel>
              <PushAction title={`Show ${commponent.title}`} target={commponent.node} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
