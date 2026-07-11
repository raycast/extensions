import { MenuBarExtra, Cache, updateCommandMetadata, launchCommand, LaunchType, environment } from "@raycast/api";

const cache = new Cache();

export default function Command() {
  const oneThing = cache.get("onething");

  if (!oneThing) {
    updateCommandMetadata({ subtitle: null });
    return null;
  }

  updateCommandMetadata({ subtitle: oneThing });

  return (
    <MenuBarExtra title={oneThing}>
      <MenuItem />
    </MenuBarExtra>
  );
}

function MenuItem() {
  if (environment.launchType === LaunchType.UserInitiated) {
    launchCommand({ name: "set-one-thing", type: LaunchType.UserInitiated });
  }

  return null;
}
