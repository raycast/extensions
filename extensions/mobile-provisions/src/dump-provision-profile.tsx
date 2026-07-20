import { ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { parseProvisioningProfile } from "./utils/parser";
import { getMarkdown, DetailMetadata, ProfileActions } from "./components/ProvisionProfileDetails";
import { ProvisioningProfile } from "./types";

type DumpProvisionProfileProps = {
  arguments: {
    filePath: string;
  };
};

export default function DumpProvisionProfile(props: DumpProvisionProfileProps) {
  const {
    data: profile,
    isLoading,
    error,
  } = usePromise(
    async (path: string): Promise<ProvisioningProfile> => {
      return await parseProvisioningProfile(path);
    },
    [props.arguments.filePath],
  );

  if (error) {
    return <Detail markdown={`## Error\n\n\`\`\`\n${error.message}\n\`\`\``} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={profile ? getMarkdown(profile) : ""}
      navigationTitle={profile?.Name ?? "Loading..."}
      metadata={profile && <DetailMetadata profile={profile} />}
      actions={
        profile && (
          <ActionPanel>
            <ProfileActions profile={profile} />
          </ActionPanel>
        )
      }
    />
  );
}
