import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getUtils } from "./generators/utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);

  const [utils, setUtils] = useState({
    ipv4: "",
    ipv6: "",
    mac: "",
    browser: "",
    os: "",
    device: "",
    timezone: "",
    uuidv1: "",
    uuidv4: "",
  });

  useEffect(() => {
    (async () => {
      const newUtils = getUtils();
      setUtils(newUtils);
    })();
    setIsLoading(false);
  }, []);

  const actions = (content: string) => {
    return (
      <ActionPanel>
        <Action.CopyToClipboard title="Copy" content={content} />
        <Action
          title="Generate New Utils"
          icon={Icon.Repeat}
          onAction={async () => {
            const newUtils = getUtils();
            setUtils(newUtils);
            setIsLoading(false);
          }}
        />
      </ActionPanel>
    );
  };

  return (
    <>
      <List isLoading={isLoading}>
        <List.Section title="Utils">
          <List.Item title={utils.ipv4} subtitle="IPv4" icon={Icon.Signal3} actions={actions(utils.ipv4)} />
          <List.Item title={utils.ipv6} subtitle="IPv6" icon={Icon.Signal3} actions={actions(utils.ipv6)} />
          <List.Item title={utils.mac} subtitle="MAC" icon={Icon.ComputerChip} actions={actions(utils.mac)} />
          <List.Item title={utils.browser} subtitle="Browser" icon={Icon.Keyboard} actions={actions(utils.browser)} />
          <List.Item title={utils.os} subtitle="OS" icon={Icon.Finder} actions={actions(utils.os)} />
          <List.Item title={utils.device} subtitle="Device" icon={Icon.Monitor} actions={actions(utils.device)} />
          <List.Item title={utils.timezone} subtitle="Timezone" icon={Icon.Clock} actions={actions(utils.timezone)} />
          <List.Item title={utils.uuidv1} subtitle="UUID v1" icon={Icon.Hashtag} actions={actions(utils.uuidv1)} />
          <List.Item title={utils.uuidv4} subtitle="UUID v4" icon={Icon.Hashtag} actions={actions(utils.uuidv4)} />
        </List.Section>
      </List>
    </>
  );
}
