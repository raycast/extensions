import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  closeMainWindow,
  popToRoot,
  Image,
} from "@raycast/api";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const CHROME_DIR = `${process.env.HOME}/Library/Application Support/Google/Chrome`;

interface Profile {
  dir: string;
  name: string;
  email: string;
  avatarUrl: string;
}

// Chrome stores custom profile names in Local State (not per-profile Preferences)
interface LocalStateCache {
  [dir: string]: { name?: string; gaia_name?: string; user_name?: string };
}

function getLocalStateProfiles(): LocalStateCache {
  try {
    const localState = JSON.parse(
      readFileSync(join(CHROME_DIR, "Local State"), "utf-8"),
    );
    return localState.profile?.info_cache || {};
  } catch {
    return {};
  }
}

function getProfiles(): Profile[] {
  try {
    const cache = getLocalStateProfiles();
    const dirs = Object.keys(cache).sort();

    return dirs.map((dir) => {
      const info = cache[dir];
      const customName = info.name || "";
      const email = info.user_name || "";

      // Read avatar URL from per-profile Preferences
      let avatarUrl = "";
      try {
        const prefs = JSON.parse(
          readFileSync(join(CHROME_DIR, dir, "Preferences"), "utf-8"),
        );
        avatarUrl = prefs.account_info?.[0]?.picture_url || "";
      } catch {
        // no avatar
      }

      return { dir, name: customName || dir, email, avatarUrl };
    });
  } catch {
    return [];
  }
}

function profileIcon(profile: Profile): Image.ImageLike {
  if (profile.avatarUrl) {
    return { source: profile.avatarUrl, mask: Image.Mask.Circle };
  }
  return Icon.PersonCircle;
}

async function openProfile(profile: Profile) {
  execFileSync("open", [
    "-na",
    "Google Chrome",
    "--args",
    `--profile-directory=${profile.dir}`,
  ]);
  await showToast(Toast.Style.Success, `Opened ${profile.name}`);
  await closeMainWindow({ clearRootSearch: true });
  await popToRoot({ clearSearchBar: true });
}

export default function Command() {
  const profiles = getProfiles();

  if (profiles.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Chrome profiles found"
          description="Make sure Google Chrome is installed"
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Select Chrome Profile...">
      {profiles.map((p) => (
        <List.Item
          key={p.dir}
          title={p.name}
          subtitle={p.email}
          accessories={[{ text: p.dir, icon: Icon.Folder }]}
          icon={profileIcon(p)}
          actions={
            <ActionPanel>
              <Action
                title="Open Profile"
                icon={Icon.Globe}
                onAction={() => openProfile(p)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
