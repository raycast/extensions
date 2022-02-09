import { useEffect, useState } from "react";
import { Icon, List, getPreferenceValues, ActionPanel, Application, Action } from "@raycast/api";

interface OpenWithAppActionProps {
  link: string;
  application: Application;
}

function OpenWithApplicationAction({ link, application }: OpenWithAppActionProps) {
  return <Action.Open target={link} title="Open Link" icon={Icon.Globe} application={application} />;
}

export default function AppPicker() {
  const preferenceValues = getPreferenceValues();
  const { link, openWithOptional, openWithRequired } = preferenceValues;
  const [query, setQuery] = useState("raycast");
  const [linkToOpen, setLinkToOpen] = useState("");
  useEffect(() => {
    setLinkToOpen(link.toLowerCase().replace("{query}", query));
  }, [query]);

  return (
    <List onSearchTextChange={setQuery}>
      <List.Item
        title={`Open ${linkToOpen} in required browser: ${JSON.stringify(openWithRequired)}`}
        actions={
          <ActionPanel>
            <OpenWithApplicationAction link={linkToOpen} application={openWithRequired} />
          </ActionPanel>
        }
      />
      <List.Item
        title={`Open ${linkToOpen} in optional browser: ${JSON.stringify(openWithOptional)}`}
        actions={
          <ActionPanel>
            <OpenWithApplicationAction link={linkToOpen} application={openWithOptional} />
          </ActionPanel>
        }
      />
    </List>
  );
}
