import { Color, Icon, List } from "@raycast/api";

export const EmptyProfiles = () => {
  return (
    <List.EmptyView
      title="No Saved Profiles"
      description="You have no saved dock profiles."
      icon={{ source: Icon.BulletPoints, tintColor: Color.Yellow }}
    />
  );
};
