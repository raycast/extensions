import { LaunchProps, showToast, Toast, confirmAlert } from '@raycast/api';
import versionManager from './utils/versionManager';

export default async function Todoist(props: LaunchProps<{ arguments: Arguments.Default }>) {
  const { version } = props.arguments;
  const isVersionManagerInstalled = versionManager.isInstalled;

  if (!isVersionManagerInstalled) {
    await confirmAlert({ title: 'Version Manager is not installed' });
  } else {
    try {
      await showToast(Toast.Style.Animated, `Making ${version} default`);
      await versionManager.default(version);
      await showToast(Toast.Style.Success, `Now ${version} is your default node version`);
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to make ${version} default, ${(error as Error).message}`);
    }
  }
}
