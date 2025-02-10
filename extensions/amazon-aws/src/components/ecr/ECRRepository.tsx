import { Repository } from "@aws-sdk/client-ecr";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchImages, getRepositoryUrl } from "../../actions/ecr";
import ECRImage from "./ECRImage";
import { AwsAction } from "../common/action";

function ECRRepository({ repository }: { repository: Repository }) {
  const { data: images, isLoading } = useCachedPromise(
    fetchImages,
    [repository.registryId ?? "", repository.repositoryName ?? ""],
    {
      keepPreviousData: true,
    },
  );
  return (
    <List.Item
      key={repository.repositoryArn}
      title={repository.repositoryName || ""}
      icon={isLoading ? Icon.CircleProgress : "aws-icons/ecr.png"}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label key={"Tag"} title={"Tag"} text={`Digest`} />
              {images?.map((i) => (
                <List.Item.Detail.Metadata.Label
                  key={i.imageDigest}
                  title={i.imageTag || ""}
                  text={i.imageDigest || ""}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push title={"View Images"} icon={Icon.Eye} target={<ECRImage repository={repository}></ECRImage>} />
          <AwsAction.Console url={getRepositoryUrl(repository.registryId || "", repository.repositoryName || "")} />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Repository URI"
              content={repository.repositoryUri || ""}
              shortcut={{ modifiers: ["opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default ECRRepository;
