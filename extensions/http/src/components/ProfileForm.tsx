import { useCallback, useState } from "react";
import { Form, Action, ActionPanel, useNavigation, Icon } from "@raycast/api";
import { Profile } from "../types";
import { FieldForm } from "./index";
import { validateNotEmptyString } from "../validation";

function ProfileForm(props: {
  profile: Profile;
  index: number;
  onCreate: (profile: Profile, index: number) => void;
  onFieldCreate: (name: string) => void;
}) {
  const { profile, index, onCreate, onFieldCreate } = props;
  const { pop } = useNavigation();

  const [stateProfile, setStateProfile] = useState<Profile>(profile);

  const [nameError, setNameError] = useState<string | undefined>();
  const validateNameErrorFunc = validateNotEmptyString(setNameError);

  const handleSubmit = useCallback(
    (values: { [key: string]: string }) => {
      profile.name = values["_name_"];

      for (const v of Object.entries(values)) {
        if (v[0] === "_name_") {
          continue;
        }
        profile.fields[v[0]] = v[1];
      }
      onCreate(profile, index);
      pop();
    },
    [onCreate, pop],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SaveDocument} title={index < 0 ? "Create" : "Save"} onSubmit={handleSubmit} />
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
                    stateProfile.fields[name] = "";
                    setStateProfile((previous) => ({ ...previous, fields: stateProfile.fields }));
                    onFieldCreate(name);
                  }}
                />
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {profile.name === "" ? <Form.Description text="New Profile" /> : <Form.Description text="Edit Profile" />}

      <Form.TextField
        id="_name_"
        title="Name"
        defaultValue={stateProfile.name}
        error={nameError}
        onChange={validateNameErrorFunc}
      />

      <Form.Separator />

      <Form.Description text="Fields" />

      {Object.entries(stateProfile.fields).map(([key, value], index) => {
        return <Form.TextField autoFocus={index === 0} key={index} id={key} title={key} defaultValue={value} />;
      })}

      <Form.Description title="Add" text="Press Cmd+Shift+N for add new field" />
    </Form>
  );
}

export default ProfileForm;
