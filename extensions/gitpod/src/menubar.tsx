import { MenuBarExtra, open, getPreferenceValues } from "@raycast/api";

import { GitpodIcons } from "../constants";

import { useHistory } from "./helpers/repository";

export default function Command() {
  const { data } = useHistory("", "");
  const { gitpodDomain } = getPreferenceValues();

  return (
    <MenuBarExtra icon={GitpodIcons.gitpod_logo_primary}>
      <MenuBarExtra.Section title="Recent Repositories">
        {data.map((repository) => (
          <MenuBarExtra.Item
            key={repository.nameWithOwner}
            title={repository.nameWithOwner}
            icon={GitpodIcons.repoIcon}
            onAction={() => open(`https://${gitpodDomain}#https://github.com/${repository.nameWithOwner}`)}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
