import { Icon, Image, List } from "@raycast/api";

import { useGrafbase } from "../hooks/use-grafbase";

export function ScopeDropdown({ onChange }: { onChange: any }) {
  const { activeSlug, setActiveSlug, personalAccount, organizationMemberships, avatarUrl } = useGrafbase();

  const handleChange = (slug: string) => {
    setActiveSlug(slug);
    onChange();
  };

  return (
    <List.Dropdown tooltip="Switch scope" value={activeSlug} onChange={(newValue) => handleChange(newValue)}>
      {personalAccount && (
        <List.Dropdown.Item
          value={personalAccount?.slug}
          title={personalAccount?.name}
          icon={{ fallback: Icon.Person, source: avatarUrl, mask: Image.Mask.RoundedRectangle }}
        />
      )}
      {organizationMemberships?.map(({ account }: any) => (
        <List.Dropdown.Item key={account?.slug} value={account?.slug} title={account?.name} icon={Icon.TwoPeople} />
      ))}
    </List.Dropdown>
  );
}
