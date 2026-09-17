import { Action, environment } from "@raycast/api";

type CreateQuicklinkProps = {
  title: string;
  quicklinkTitle: string;
  command: string;
  data?: {
    [item: string]: string;
  };
};

export function CreateQuicklink({ title, quicklinkTitle, command, data }: CreateQuicklinkProps) {
  const protocol = `${process.env.RAYCAST_SCHEME ?? "raycast"}://`;
  let url = `${protocol}extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/${command}`;
  if (data) {
    url += `?context=${encodeURIComponent(JSON.stringify(data))}`;
  }
  return (
    <Action.CreateQuicklink
      title={title}
      quicklink={{
        name: quicklinkTitle,
        link: url,
      }}
    />
  );
}
