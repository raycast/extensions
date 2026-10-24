import { Form, Icon } from "@raycast/api";
import { normalizeCustomIconValue } from "./url-icons";

export const CUSTOM_ICON_VALUE = "__custom_icon__";

const ICON_OPTIONS = [
  { value: "🌙", title: "Moon", icon: "🌙" },
  { value: "⚡", title: "Lightning", icon: "⚡" },
  { value: "✨", title: "Sparkles", icon: "✨" },
  { value: "🔗", title: "Link", icon: "🔗" },
  { value: "🚀", title: "Rocket", icon: "🚀" },
  { value: "moon", title: "Raycast Moon", icon: Icon.Moon },
  { value: "link", title: "Raycast Link", icon: Icon.Link },
  { value: "bolt", title: "Raycast Bolt", icon: Icon.Bolt },
  { value: "gear", title: "Raycast Gear", icon: Icon.Gear },
  { value: "terminal", title: "Raycast Terminal", icon: Icon.Terminal },
];

export function IconDropdownItems() {
  return (
    <>
      <Form.Dropdown.Item
        value=""
        title="Site Icon / Default"
        icon={Icon.Globe}
      />
      {ICON_OPTIONS.map((option) => (
        <Form.Dropdown.Item
          key={option.value}
          value={option.value}
          title={option.title}
          icon={option.icon}
        />
      ))}
      <Form.Dropdown.Item
        value={CUSTOM_ICON_VALUE}
        title="Custom..."
        icon={Icon.Pencil}
      />
    </>
  );
}

export function getIconDropdownValue(icon: unknown): string {
  const normalized = normalizeCustomIconValue(icon);
  if (!normalized) {
    return "";
  }

  return ICON_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : CUSTOM_ICON_VALUE;
}

export function getCustomIconDefaultValue(icon: unknown): string {
  const normalized = normalizeCustomIconValue(icon);
  return normalized && getIconDropdownValue(normalized) === CUSTOM_ICON_VALUE
    ? normalized
    : "";
}

export function resolveIconPickerValue({
  icon,
  customIcon,
}: {
  icon: unknown;
  customIcon?: unknown;
}): string | undefined {
  return normalizeCustomIconValue(
    icon === CUSTOM_ICON_VALUE ? customIcon : icon,
  );
}
