import { Detail, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execWinget } from "../utils/winget/commands";
import { parsePackageDetail } from "../utils/winget/parse";

interface Props {
  packageId: string;
}

function usePackageDetail(packageId: string) {
  return usePromise(
    async (id: string) => {
      const output = await execWinget([
        "show",
        "--id",
        id,
        "--exact",
        "--accept-source-agreements",
        "--disable-interactivity",
      ]);
      return parsePackageDetail(output);
    },
    [packageId],
  );
}

function buildMarkdown(name: string, description?: string): string {
  if (!description) return `# ${name}`;
  return `# ${name}\n\n${description}`;
}

/**
 * Sidebar detail panel used inside a `List.Item`.
 * Lazily fetches `winget show --id <packageId>` on first render.
 */
export function PackageListDetail({ packageId }: Props) {
  const { data, isLoading } = usePackageDetail(packageId);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={data ? buildMarkdown(data.name, data.description) : undefined}
      metadata={
        data ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="ID" text={data.id} />
            <List.Item.Detail.Metadata.Label title="Version" text={data.version} />
            {data.publisher && <List.Item.Detail.Metadata.Label title="Publisher" text={data.publisher} />}
            {data.publisherUrl && (
              <List.Item.Detail.Metadata.Link
                title="Publisher URL"
                target={data.publisherUrl}
                text={data.publisherUrl}
              />
            )}
            {data.homepage && (
              <List.Item.Detail.Metadata.Link title="Homepage" target={data.homepage} text={data.homepage} />
            )}
            {data.license && <List.Item.Detail.Metadata.Label title="License" text={data.license} />}
            {data.moniker && <List.Item.Detail.Metadata.Label title="Moniker" text={data.moniker} />}
            {data.installerType && <List.Item.Detail.Metadata.Label title="Installer Type" text={data.installerType} />}
            {data.tags && data.tags.length > 0 && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {data.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              </>
            )}
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
}

/**
 * Full-screen detail push view. Used via `Action.Push` for a richer detail page.
 */
export function PackageDetailView({ packageId }: Props) {
  const { data, isLoading } = usePackageDetail(packageId);

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? buildMarkdown(data.name, data.description) : "Loading…"}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={data.id} />
            <Detail.Metadata.Label title="Version" text={data.version} />
            {data.publisher && <Detail.Metadata.Label title="Publisher" text={data.publisher} />}
            {data.publisherUrl && (
              <Detail.Metadata.Link title="Publisher URL" target={data.publisherUrl} text={data.publisherUrl} />
            )}
            {data.homepage && <Detail.Metadata.Link title="Homepage" target={data.homepage} text={data.homepage} />}
            {data.license && <Detail.Metadata.Label title="License" text={data.license} />}
            {data.moniker && <Detail.Metadata.Label title="Moniker" text={data.moniker} />}
            {data.installerType && <Detail.Metadata.Label title="Installer Type" text={data.installerType} />}
            {data.tags && data.tags.length > 0 && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Tags">
                  {data.tags.map((tag) => (
                    <Detail.Metadata.TagList.Item key={tag} text={tag} />
                  ))}
                </Detail.Metadata.TagList>
              </>
            )}
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}
