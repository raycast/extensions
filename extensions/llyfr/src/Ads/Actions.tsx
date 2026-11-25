import { Action, useNavigation, Icon } from "@raycast/api";

import EntryDetails from "./EntryDetails";

export function OpenDetailsAction({ bibcode, api_token, path }: { bibcode: string; api_token: string; path?: string }) {
  const { push } = useNavigation();
  return (
    <Action
      icon={Icon.BulletPoints}
      title="Show Details"
      onAction={async () => {
        push(<EntryDetails bibcode={bibcode} api_token={api_token} path={path} />);
      }}
    />
  );
}
