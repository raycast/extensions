import { launchCommand, showToast, Toast } from "@raycast/api";

export class CoordinatorNotFoundError extends Error {}

type TryLaunchCommandOptions = Parameters<typeof launchCommand>[0] & {
  failureMessage?: string;
};

export async function tryLaunchCommand({ name, type, failureMessage }: TryLaunchCommandOptions): Promise<boolean> {
  try {
    await launchCommand({
      name,
      type,
    });

    return true;
  } catch (error) {
    if (failureMessage !== undefined) {
      await showToast({
        title: failureMessage,
        style: Toast.Style.Failure,
      });
    }

    return false;
  }
}

export async function handleCommandError(error: unknown): Promise<boolean> {
  if (error instanceof Error && error.message.includes("No players found")) {
    await showToast({
      title: "No Sonos system detected",
      style: Toast.Style.Failure,
    });

    return true;
  }

  return false;
}
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export const NoSystemContent = `## 🔇 No Sonos system detected



If you have in fact have an active system on the current network, [report this as a bug](https://github.com/raycast/extensions/issues/new?body=%3C!--%0APlease%20update%20the%20title%20above%20to%20consisely%20describe%20the%20issue%0A--%3E%0A%0A%23%23%23%20Extension%0A%0Ahttps://www.raycast.com/AntonNiklasson/sonos%0A%0A%23%23%23%20Description%0A%0A%3C!--%0APlease%20provide%20a%20clear%20and%20concise%20description%20of%20what%20the%20bug%20is.%20Include%0Ascreenshots%20if%20needed.%20Please%20test%20using%20the%20latest%20version%20of%20the%20extension,%20Raycast%20and%20API.%0A--%3E%0A%23%23%23%20Steps%20To%20Reproduce%0A%0A%3C!--%0AYour%20bug%20will%20get%20fixed%20much%20faster%20if%20the%20extension%20author%20can%20easily%20reproduce%20it.%20Issues%20without%20reproduction%20steps%20may%20be%20immediately%20closed%20as%20not%20actionable.%0A--%3E%0A%0A1.%20In%20this%20environment...%0A2.%20With%20this%20config...%0A3.%20Run%20%27...%27%0A4.%20See%20error...%0A%0A%23%23%23%20Current%20Behaviour%0A%0A%0A%23%23%23%20Expected%20Behaviour%0A%0A%23%23%23%20Raycast%20version%0AVersion:%201.66.2%0A&title=%5BSonos%5D%20...&template=extension_bug_report.yml&labels=extension,bug&extension-url=https://www.raycast.com/AntonNiklasson/sonos&description).`;
