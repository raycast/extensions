import {
  MenuBarExtra,
  Cache,
  updateCommandMetadata,
  launchCommand,
  LaunchType,
  environment,
  getPreferenceValues,
} from "@raycast/api";
import { useMemo } from "react";

const cache = new Cache();
const { prefix, suffix } = getPreferenceValues<{ prefix: string; suffix: string }>();

export default function Command() {
  const oneThing = cache.get("onething");

  if (!oneThing) {
    updateCommandMetadata({ subtitle: null });
    return null;
  }

  updateCommandMetadata({ subtitle: oneThing });

  const title = useMemo(() => {
    let title = oneThing;

    if (prefix) {
      title = `${prefix} ${title}`;
    }

    if (suffix) {
      title = `${title} ${suffix}`;
    }

    return title;
  }, [oneThing]);

  return (
    <MenuBarExtra title={title}>
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
