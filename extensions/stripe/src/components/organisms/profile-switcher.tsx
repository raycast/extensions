import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import { useProfileContext } from "@src/hooks";
import { Environment } from "@src/types";
import { SHORTCUTS } from "@src/constants/keyboard-shortcuts";

/**
 * Profile and Environment switcher action panel section
 * Add this to any ActionPanel to allow users to switch profiles and environments
 */
export const ProfileSwitcherActions = () => {
  const { activeProfile, activeEnvironment, profiles, setActiveProfile, setActiveEnvironment } = useProfileContext();

  return (
    <>
      <ActionPanel.Section title="Account & Environment">
        {profiles.length > 1 && (
          <ActionPanel.Submenu title="Switch Account" icon={Icon.Person} shortcut={SHORTCUTS.SWITCH_PROFILE}>
            {profiles.map((profile) => (
              <Action
                key={profile.id}
                title={profile.name}
                icon={
                  activeProfile?.id === profile.id
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: profile.color as Color.ColorLike }
                }
                onAction={() => setActiveProfile(profile.id)}
              />
            ))}
          </ActionPanel.Submenu>
        )}

        <ActionPanel.Submenu
          title={`Environment: ${activeEnvironment === "test" ? "Test" : "Live"}`}
          icon={Icon.Globe}
          shortcut={SHORTCUTS.SWITCH_ENVIRONMENT}
        >
          <Action
            title="Test Mode"
            icon={activeEnvironment === "test" ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            onAction={() => setActiveEnvironment("test" as Environment)}
          />
          <Action
            title="Live Mode"
            icon={activeEnvironment === "live" ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            onAction={() => setActiveEnvironment("live" as Environment)}
          />
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    </>
  );
};
