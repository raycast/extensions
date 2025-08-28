import { Repository } from "@aws-sdk/client-ecr";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchImages, getImageUrl } from "../../actions/ecr";
import { getFilterPlaceholder } from "../../util";
import { AwsAction } from "../common/action";

function ECRImage({ repository }: { repository: Repository }) {
  const { data: images, isLoading } = useCachedPromise(
    fetchImages,
    [repository.registryId ?? "", repository.repositoryName ?? ""],
    {
      keepPreviousData: true,
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder={getFilterPlaceholder("images")} isShowingDetail={true}>
      {images ? (
        images.map((image) => (
          <List.Item
            key={image.imageDigest}
            title={image.imageTag || ""}
            icon={isLoading ? Icon.CircleProgress : "aws-icons/ecr.png"}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label key={"Tag"} title={"Tag"} text={`Digest`} />
                    <List.Item.Detail.Metadata.Label
                      key={image.imageDigest}
                      title={image.imageTag || ""}
                      text={image.imageDigest || ""}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <AwsAction.Console url={getImageUrl(repository, image.imageDigest || "")} />
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Image Tag"
                    content={image.imageTag || ""}
                    shortcut={{ modifiers: ["ctrl"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Full Image URI"
                    content={`${repository.repositoryUri}:${image.imageTag}`}
                    shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Repository URI"
                    content={repository.repositoryUri || ""}
                    shortcut={{ modifiers: ["opt"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="No Images Found" />
      )}
    </List>
  );
}

export default ECRImage;
