import { ManageMouseScroll } from "./application/manage-mouse-scroll";
import { MacOSHelperLifecycle } from "./adapters/macos/helper-lifecycle";
import { FileProfileRepository } from "./adapters/macos/file-profile-repository";
import { extensionPaths } from "./adapters/macos/paths";
import { NativeHelperClient } from "./adapters/native/native-helper-client";
import { MouseScrollView } from "./adapters/raycast/mouse-scroll-view";

export default function Command() {
  const paths = extensionPaths();
  const client = new NativeHelperClient(paths.packagedExecutable, paths.installedExecutable, paths.state);
  const lifecycle = new MacOSHelperLifecycle(client, paths);
  const useCase = new ManageMouseScroll(client, new FileProfileRepository(paths.config), lifecycle);
  return <MouseScrollView useCase={useCase} />;
}
