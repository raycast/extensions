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

import { previewProject } from "@/utils";
import { ProjectList, ImageView } from "@/components";
import type { ExtensionConfig, Project, ProjectExtraInfo } from "@/types";

export default function PreviewProject() {
  const { push, pop } = useNavigation();

  async function handlePreviewProject(project: Project, config: ExtensionConfig, extraInfo: ProjectExtraInfo) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating QR Code...",
    });

    try {
      const qrcodePath = await previewProject(project.path, project.id);
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
              {/* TODO: Action.ShowInFinder is macOS-specific and doesn't exist on Windows. Use Action.Open or check the platform and conditionally show the appropriate action. */}
              <Action.ShowInFinder title="WeChat QR Code in Finder" path={qrcodePath} />
            </ActionPanel>
          }
        />,
      );
      toast.hide();
    } catch (error) {
      showFailureToast(error, { title: "Failed to Preview Project" });
    }
  }

  return <ProjectList onProjectAction={handlePreviewProject} actionTitle="Preview Project" />;
}
