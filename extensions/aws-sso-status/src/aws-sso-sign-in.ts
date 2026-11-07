import { launchCommand, LaunchProps, LaunchType, showToast, Toast } from "@raycast/api";
import { CliError } from "./aws/cli";
import { ConfigError } from "./aws/config";
import { discoverLoginProfile, LoginSelectionError } from "./aws/login";
import { effectiveSettings } from "./runtime";
import { signInWithToast } from "./sign-in";
export default async function Command(
  props: LaunchProps<{
    arguments: {
      profile?: string;
    };
  }>,
) {
  const settings = effectiveSettings();
  try {
    const profile = await discoverLoginProfile(settings, props.arguments.profile);
    await signInWithToast(profile, settings);
    try {
      await launchCommand({ name: "aws-sso-menu-bar", type: LaunchType.Background });
    } catch {
      /* Menu bar may be disabled. */
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AWS Sign-In Failed",
      message:
        error instanceof CliError || error instanceof ConfigError || error instanceof LoginSelectionError
          ? error.message
          : "Check your AWS CLI configuration and try again.",
    });
  }
}
