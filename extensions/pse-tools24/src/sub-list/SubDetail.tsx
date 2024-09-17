import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { SubRecord, getInstrumentation } from "./api";
import { getConfig } from "./api";
import ConfigList from "./ConfigList";

function SubDetail(sub: SubRecord) {
  const [inst, setInst] = useState("");
  const [config, setConfig] = useState({});
  useEffect(() => {
    (async () => {
      setInst(await getInstrumentation(sub.instance));
      setConfig(await getConfig(sub));
    })();
  }, []);

  const origin = `https://${sub.instance}.quantummetric.com`;

  return (
    <List>
      <List.Item title="Instrumentation:" accessories={[{ text: inst }]} actions={<ActionPanel title="Actions">
        <Action.OpenInBrowser title="CDN" url={`https://cdn.quantummetric.com/qscripts/quantum-${sub.instance}.js`}/>
        <Action.CopyToClipboard content={inst}/>
      </ActionPanel>} />
      <List.Item
        title="Config"
        actions={
          <ActionPanel title="Actions">
            {typeof config != 'string' && 
            <Action.Push
              title="List Config"
              target={<ConfigList {...config} />}
            />
            }
            <Action.OpenInBrowser
              title="Settings"
              url={`${origin}/#/settings/admin`}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Events"
        actions={
          <ActionPanel title="Actions">
            <Action.OpenInBrowser
              title="Events"
              url={origin + "/#/settings/event"}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Alerts"
        actions={
          <ActionPanel title="Actions">
            <Action.OpenInBrowser
              title="Alerts"
              url={origin + "/#/alerts"}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Teams"
        actions={
          <ActionPanel title="Actions">
            <Action.OpenInBrowser
              title="Events"
              url={origin + "/#/settings/teams"}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default SubDetail;
