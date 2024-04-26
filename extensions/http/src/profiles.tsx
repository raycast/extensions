import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { NewProfile, Profile, StateProfiles } from "./types";
import { useCallback, useEffect } from "react";
import ProfileForm from "./components/ProfileForm";
import ActionStyle = Alert.ActionStyle;
import { FieldForm } from "./components";

export default function Command() {
  const [stateProfiles, setStateProfiles] = useCachedState<StateProfiles>("profiles", {
    isLoading: true,
    items: [],
  });

  useEffect(() => {
    (async () => {
      const storedProfiles = await LocalStorage.getItem<string>("profiles");

      if (!storedProfiles) {
        setStateProfiles((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const items: Profile[] = JSON.parse(storedProfiles);
        setStateProfiles((previous) => ({ ...previous, items, isLoading: false }));
      } catch (e) {
        await showToast(Toast.Style.Failure, "Error", "Can't decode profiles data");
        console.error(e);
        setStateProfiles((previous) => ({ ...previous, items: [], fields: [], isLoading: false }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("profiles", JSON.stringify(stateProfiles.items));
  }, [stateProfiles.items]);

  const handleCreateProfile = useCallback(
    (profile: Profile) => {
      const newProfiles = [...stateProfiles.items, profile];
      setStateProfiles((previous) => ({ ...previous, items: newProfiles }));
    },
    [stateProfiles.items, setStateProfiles],
  );

  const handleUpdateProfile = useCallback(
    (profile: Profile, index: number) => {
      // console.log('update profile', profile, index);
      const newProfiles = [...stateProfiles.items];
      newProfiles[index] = profile;
      setStateProfiles((previous) => ({ ...previous, items: newProfiles }));
    },
    [stateProfiles.items, setStateProfiles],
  );

  const handleDeleteProfile = useCallback(
    async (index: number, name: string) => {
      return confirmAlert({
        title: "Are you sure?",
        message: `Delete profile "${name}"`,
        dismissAction: { title: "Cancel" },
        primaryAction: {
          title: "Delete",
          style: ActionStyle.Destructive,
          onAction: () => {
            const newProfiles = [...stateProfiles.items];
            newProfiles.splice(index, 1);
            setStateProfiles((previous) => ({ ...previous, items: newProfiles }));
          },
        },
      });
    },
    [stateProfiles.items, setStateProfiles],
  );

  const getNewProfile = useCallback((): Profile => {
    const p = NewProfile();
    if (stateProfiles.items.length > 0) {
      for (const [key] of Object.entries(stateProfiles.items[0].fields)) {
        p.fields[key] = "";
      }
    }
    return p;
  }, [stateProfiles.items]);

  const handleCreateField = useCallback(
    (name: string) => {
      // console.log('handleCreateField', name);
      stateProfiles.items.map((profile) => {
        profile.fields[name] = "";
      });
      setStateProfiles((previous) => ({ ...previous, items: stateProfiles.items }));
    },
    [stateProfiles.items, setStateProfiles],
  );

  const handleDeleteField = useCallback(
    (key: string) => {
      return confirmAlert({
        title: "Are you sure?",
        message: `Delete field "${key}" from all profiles`,
        dismissAction: { title: "Cancel" },
        primaryAction: {
          title: "Delete",
          style: ActionStyle.Destructive,
          onAction: () => {
            const newProfiles = [...stateProfiles.items];
            newProfiles.map((profile) => {
              delete profile.fields[key];
            });
            setStateProfiles((previous) => ({ ...previous, items: newProfiles }));
          },
        },
      });
    },
    [stateProfiles.items, setStateProfiles],
  );

  return (
    <List isShowingDetail>
      <List.EmptyView
        title={"No Profiles"}
        icon={Icon.BlankDocument}
        description={"Create a new profile using the Cmd+N shortcut"}
        actions={
          <ActionPanel>
            <Action.Push
              title={"Create New Profile"}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <ProfileForm
                  profile={getNewProfile()}
                  index={-1}
                  onCreate={handleCreateProfile}
                  onFieldCreate={handleCreateField}
                />
              }
            />
          </ActionPanel>
        }
      />

      {stateProfiles.items.map((profile, index) => (
        <List.Item
          key={profile.id}
          title={profile.name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {Object.entries(profile.fields).map(([key, value], index) => {
                    return <Detail.Metadata.Label key={index} title={key} text={value} />;
                  })}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title={"Edit"}
                icon={Icon.Pencil}
                target={
                  <ProfileForm
                    profile={profile}
                    index={index}
                    onCreate={handleUpdateProfile}
                    onFieldCreate={handleCreateField}
                  />
                }
              />
              <Action.Push
                title={"New"}
                icon={Icon.NewDocument}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <ProfileForm
                    profile={getNewProfile()}
                    index={-1}
                    onCreate={handleCreateProfile}
                    onFieldCreate={handleCreateField}
                  />
                }
              />
              <Action
                title={"Delete"}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => handleDeleteProfile(index, profile.name)}
              />

              <ActionPanel.Section title="Fields">
                <Action.Push
                  title="Add"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  target={
                    <FieldForm
                      name=""
                      index={-1}
                      onCreate={(name: string) => {
                        handleCreateField(name);
                      }}
                    />
                  }
                />
                <ActionPanel.Submenu icon={Icon.Trash} title={"Delete Field"}>
                  {Object.entries(profile.fields).map(([key]) => {
                    return <Action key={key} title={key} onAction={() => handleDeleteField(key)} />;
                  })}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
