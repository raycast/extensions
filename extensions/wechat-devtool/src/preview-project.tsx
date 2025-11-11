import { showFailureToast } from "@raycast/utils";
import {
  useNavigation,
  showToast,
  Toast,
  Detail,
  ActionPanel,
  Action,
  popToRoot,
  closeMainWindow,
  Icon,
} from "@raycast/api";

import ProjectList from "./components/project-list";
import ImageView from "./components/image-view";
import { previewProject } from "./utils/command";
import { ExtensionConfig, Project, ProjectExtraInfo } from "./types";

export default function PreviewProject() {
  const { push, pop } = useNavigation();

  async function handlePreviewProject(project: Project, config: ExtensionConfig, extraInfo: ProjectExtraInfo) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating QR Code...",
    });

    try {
      const qrcodePath = await previewProject(config.cliPath, project.path, project.id);
      /* eslint-disable @raycast/prefer-title-case */
      push(
        <ImageView
          image={qrcodePath}
          width={300}
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="Project Name" text={project.name} />
              <Detail.Metadata.Label title="Project Path" text={extraInfo.displayPath} />
              {extraInfo.branch && <Detail.Metadata.Label title="Project Branch" text={extraInfo.branch} />}
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action
                title="Close Window"
                icon={Icon.Xmark}
                onAction={() => {
                  popToRoot();
                  closeMainWindow();
                }}
              />
              <Action
                title="Regenerate QR Code"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  pop();
                  setTimeout(() => {
                    handlePreviewProject(project, config, extraInfo);
                  }, 100);
                }}
              />
              <Action.ShowInFinder title="Show QR Code in Finder" path={qrcodePath} />
            </ActionPanel>
          }
        />,
      );
      /* eslint-enable */
      toast.hide();
    } catch (error) {
      showFailureToast(error, { title: "Failed to Preview Project" });
    }
  }

  return <ProjectList onProjectAction={handlePreviewProject} actionTitle="Preview Project" />;
}
