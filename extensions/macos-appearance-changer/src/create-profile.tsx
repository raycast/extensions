import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { randomUUID } from "node:crypto";
import { Profiles } from "./lib/profiles";
import { defaultIconModeForStyle } from "./utils/default-icon-mode.util";
import { capitalize } from "./utils/capitalize.util";
import { ICON_MODE_OPTIONS } from "./constants/icon-mode-options.constant";
import { IconStyle, IconMode, Appearance, type Profile } from "./types/types";

type CreateProfileProps = {
  existingProfile?: Profile;
};

export default function CreateProfile({ existingProfile }: CreateProfileProps = {}) {
  const { pop } = useNavigation();
  const isEditing = !!existingProfile;

  const [iconStyle, setIconStyle] = useState<IconStyle>(existingProfile?.iconStyle ?? IconStyle.Default);
  const [iconMode, setIconMode] = useState<IconMode>(existingProfile?.iconMode ?? IconMode.None);
  const [appearance, setAppearance] = useState<Appearance>(existingProfile?.appearance ?? Appearance.Auto);

  const modeOptions = ICON_MODE_OPTIONS[iconStyle];

  const onIconStyleChanged = (value: string) => {
    const newStyle = value as IconStyle;
    setIconStyle(newStyle);
    setIconMode(defaultIconModeForStyle(newStyle));
  };

  const saveProfileAndDismiss = async (values: { name: string; wallpaper: string[] }) => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      await showToast({ style: Toast.Style.Failure, title: "Profile name is required" });
      return;
    }

    const profile: Profile = {
      id: existingProfile?.id ?? randomUUID(),
      name: trimmedName,
      wallpaperPath: values.wallpaper?.[0] ?? "",
      iconStyle,
      iconMode,
      appearance,
    };

    await Profiles.save(profile);
    await showToast({
      style: Toast.Style.Success,
      title: isEditing ? "Profile updated" : "Profile created",
      message: profile.name,
    });
    pop();
  };

  return (
    <Form
      navigationTitle={isEditing ? "Edit Profile" : "Create Profile"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Profile" : "Create Profile"} onSubmit={saveProfileAndDismiss} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Profile" defaultValue={existingProfile?.name ?? ""} />

      <Form.FilePicker
        id="wallpaper"
        title="Wallpaper"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        defaultValue={existingProfile?.wallpaperPath ? [existingProfile.wallpaperPath] : []}
      />

      <Form.Separator />

      <Form.Dropdown id="iconStyle" title="Icon Style" value={iconStyle} onChange={onIconStyleChanged}>
        {Object.values(IconStyle).map((style) => (
          <Form.Dropdown.Item key={style} value={style} title={style} />
        ))}
      </Form.Dropdown>

      {modeOptions.length > 0 && (
        <Form.Dropdown
          id="iconMode"
          title="Icon Mode"
          value={iconMode}
          onChange={(value) => setIconMode(value as IconMode)}
        >
          {modeOptions.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />

      <Form.Dropdown
        id="appearance"
        title="System Appearance"
        value={appearance}
        onChange={(v) => setAppearance(v as Appearance)}
      >
        {Object.values(Appearance).map((mode) => (
          <Form.Dropdown.Item key={mode} value={mode} title={capitalize(mode)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
