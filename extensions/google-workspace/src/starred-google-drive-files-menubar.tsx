import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { File, getStarredFilesURL } from "./api/getFiles";
import { withGoogleAuth, getOAuthToken } from "./components/withGoogleAuth";
import { getFileIconLink } from "./helpers/files";

function StarredFiles() {
  const { data, isLoading } = useFetch<{ files: File[] }>(getStarredFilesURL(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOAuthToken()}`,
    },
  });

  const MAX_ITEMS = 40;

  const hasFiles = data?.files && data.files.length > 0;

  return (
    <MenuBarExtra icon="google-drive.png" tooltip="Your starred Google Drive files" isLoading={isLoading}>
      {hasFiles ? (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Open Starred Files in Google Drive"
              icon="google-drive.png"
              onAction={() => open("https://drive.google.com/drive/starred", "com.google.Chrome")}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            {data.files.map((file) => (
              <MenuBarExtra.Item
                key={file.id}
                title={file.name}
                icon={getFileIconLink(file.mimeType)}
                onAction={() => {
                  console.log(file);
                  open(file.webViewLink);
                }}
              />
            ))}
          </MenuBarExtra.Section>

          {data.files.length > MAX_ITEMS ? (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item
                icon={Icon.List}
                title={`You have more than ${MAX_ITEMS} starred files. Use the Raycast command to see them all.`}
              />
            </MenuBarExtra.Section>
          ) : null}
        </>
      ) : (
        <MenuBarExtra.Item title="No starred files" />
      )}
    </MenuBarExtra>
  );
}

export default function Command() {
  return withGoogleAuth(<StarredFiles />);
}
