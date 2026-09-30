import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import type { ProfilesItem } from "interfaces/profile";
import { deleteProfile } from "common/deleteProfile";
import { listProfiles } from "common/listProfiles";

const ListProfiles = () => {
  const [profiles, setProfiles] = useState<ProfilesItem[]>([]);

  const getProfiles = async () => {
    const profiles = await listProfiles();
    setProfiles(profiles);
  };

  useEffect(() => {
    getProfiles();
  }, []);

  return (
    <List isLoading={profiles.length === 0}>
      {profiles.map((profile) => (
        <List.Item
          key={profile.PK}
          title={profile.name}
          subtitle={`FLT: ${profile.profile.flt.count}  CFLT: ${profile.profile.cflt.count}  IPFLT: ${profile.profile.ipflt.count}  RULES: ${profile.profile.rule.count}  SVC: ${profile.profile.svc.count}  GRP: ${profile.profile.grp.count}`}
          actions={
            <ActionPanel title={profile.name}>
              <Action
                title="Delete"
                onAction={async () => {
                  if (
                    !(await confirmAlert({
                      title: "Delete the profile?",
                      message: `Are you sure you want to delete the profile ${profile.name}? This is irreversible.`,
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    }))
                  ) {
                    return;
                  }

                  try {
                    await deleteProfile(profile.PK);
                  } catch (err) {
                    await showToast({
                      title: "Deletion Failed",
                      message: (err as Error).message,
                      style: Toast.Style.Failure,
                    });
                    return;
                  }

                  await showToast({
                    title: "Deletion Successful",
                    message: `Profile ${profile.name} deleted`,
                  });

                  await getProfiles();
                }}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default ListProfiles;
