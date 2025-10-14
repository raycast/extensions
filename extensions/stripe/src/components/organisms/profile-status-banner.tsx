import { Detail, Color } from "@raycast/api";
import { useProfileContext } from "@src/hooks";

interface ProfileStatusBannerProps {
  /**
   * Custom message to display instead of the default
   */
  message?: string;
  /**
   * Whether to show as an error state
   */
  isError?: boolean;
}

/**
 * Component that displays the current profile and environment status
 * Use this in Detail or Form views where ListContainer isn't available
 */
export const ProfileStatusBanner = ({ message }: ProfileStatusBannerProps = {}) => {
  const { activeProfile, activeEnvironment } = useProfileContext();

  const envText = activeEnvironment === "test" ? "Test Mode" : "Live Mode";

  const defaultMessage = activeProfile
    ? `**Profile:** ${activeProfile.name}\n**Environment:** ${envText}`
    : "No profile selected";

  const displayMessage = message || defaultMessage;

  return (
    <Detail
      markdown={`# Status\n\n${displayMessage}`}
      metadata={
        activeProfile && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Active Profile" text={activeProfile.name} />
            <Detail.Metadata.Label title="Environment" text={envText} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Test API Key"
              icon={
                activeProfile.testApiKey
                  ? { source: "✅", tintColor: Color.Green }
                  : { source: "❌", tintColor: Color.Red }
              }
            />
            <Detail.Metadata.Label
              title="Live API Key"
              icon={
                activeProfile.liveApiKey
                  ? { source: "✅", tintColor: Color.Green }
                  : { source: "❌", tintColor: Color.Red }
              }
            />
          </Detail.Metadata>
        )
      }
    />
  );
};
