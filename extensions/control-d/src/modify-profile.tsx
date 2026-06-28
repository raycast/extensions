import { Action, ActionPanel, Form, Toast, showHUD, showToast } from "@raycast/api";
import { ProfilesItem } from "interfaces/profile";
import { useState, useEffect } from "react";
import { listProfiles } from "common/listProfiles";
import { modifyProfile } from "common/modifyProfile";

const ModifyProfile = () => {
  const [profiles, setProfiles] = useState<ProfilesItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | undefined>(undefined);
  const [selectedProfileError, setSelectedProfileError] = useState<string | undefined>(undefined);
  const [newName, setNewName] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  const getProfiles = async () => {
    const profiles = await listProfiles();
    setProfiles(profiles);
  };

  const submit = async () => {
    if (!selectedProfile) {
      setSelectedProfileError("Profile is required");
      return;
    }

    if (!newName) {
      setNameError("Name is required");
      return;
    }

    setNameError(undefined);
    setSelectedProfileError(undefined);

    try {
      await modifyProfile(selectedProfile, newName);
    } catch (err) {
      await showToast({
        title: "Modification Failed",
        message: (err as Error).message,
        style: Toast.Style.Failure,
      });
      return;
    }

    await showHUD("Modification successful ✅");
  };

  useEffect(() => {
    getProfiles();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Submit" onAction={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="profile"
        title="Profile"
        placeholder="Select a profile"
        onChange={(newValue) => {
          setSelectedProfile(newValue);
          setNewName(profiles.find((profile) => profile.PK === newValue)?.name);
        }}
        error={selectedProfileError}
      >
        {profiles.map((profile) => (
          <Form.Dropdown.Item key={profile.PK as string} value={profile.PK as string} title={profile.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        error={nameError}
        id="name"
        title="Enter new name"
        value={newName}
        onChange={(newValue) => {
          setNewName(newValue);
        }}
      />
    </Form>
  );
};

export default ModifyProfile;
