import { getPreferenceValues, Color, Icon, Form } from "@raycast/api";
import { VisibilityOption } from "../utils/types";

const visibilityOptions: VisibilityOption[] = [
  { value: "public", title: "Public", icon: Icon.Livestream },
  { value: "unlisted", title: "Unlisted", icon: Icon.LivestreamDisabled },
  { value: "private", title: "Followers-only", icon: Icon.TwoPeople },
  { value: "direct", title: "Direct", icon: Icon.Envelope },
  { value: "local", title: "Local-only", icon: Icon.Pin },
];

const VisibilityDropdown = () => {
  const { defaultVisibility }: Preferences = getPreferenceValues();

  return (
    <Form.Dropdown id="visibility" title="Visibility" storeValue={true} defaultValue={defaultVisibility || undefined}>
      {visibilityOptions.map(({ value, title, icon }) => (
        <Form.Dropdown.Item
          key={value}
          value={value}
          title={title}
          icon={{ source: icon, tintColor: Color.SecondaryText }}
        />
      ))}
    </Form.Dropdown>
  );
};

export default VisibilityDropdown;
