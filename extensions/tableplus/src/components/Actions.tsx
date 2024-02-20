import { Action, Icon } from "@raycast/api";
import { preferences } from "../constants";
import { Connection } from "../interfaces";

export const OpenActions = (props: { connection: Connection; groupName: string }) => {
  const { connection } = props;

  return preferences.defaultAction == "tab" ? (
    <>
      {connection.version >= 492 && (
        <Action.OpenInBrowser
          title="Open Database in New Tab"
          icon={Icon.Coin}
          url={`tableplus://?id=${connection.id}&windowMode=tabbed`}
        />
      )}
      <Action.OpenInBrowser title="Open Database" icon={Icon.Coin} url={`tableplus://?id=${connection.id}`} />
    </>
  ) : (
    <>
      <Action.OpenInBrowser title="Open Database" icon={Icon.Coin} url={`tableplus://?id=${connection.id}`} />
      {connection.version >= 492 && (
        <Action.OpenInBrowser
          title="Open Database in New Tab"
          icon={Icon.Coin}
          url={`tableplus://?id=${connection.id}&windowMode=tabbed`}
        />
      )}
    </>
  );
};
