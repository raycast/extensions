import React from "react";

import { pyGetProfilesList } from "../core";
import { PythonItermCommand } from "../components";
import { Action, ActionPanel, List } from "@raycast/api";
import { renderSubComponent } from "../utils";

export type ProfilesListProps = {
  children: (profile: string) => React.ReactNode;
};

export const ProfilesList: React.FC<ProfilesListProps> = (props) => {
  const [selectedProfile, setSelectedProfile] = React.useState<string | null>(null);

  if (selectedProfile) {
    return <>{renderSubComponent<string>(selectedProfile, props.children)}</>;
  }

  return (
    <PythonItermCommand
      title={"Getting profiles..."}
      errorTitle={"Failed to get profiles"}
      exitOnSuccess={false}
      scripts={[pyGetProfilesList()]}
    >
      {([profilesStr]) => {
        const profiles = JSON.parse(profilesStr) as string[];

        return (
          <List>
            {profiles.map((profile, index) => (
              <List.Item
                key={`profile_${index}`}
                title={profile}
                actions={
                  <ActionPanel>
                    <Action title={"Select Profile"} onAction={() => setSelectedProfile(profile)} />
                  </ActionPanel>
                }
              />
            ))}
          </List>
        );
      }}
    </PythonItermCommand>
  );
};
