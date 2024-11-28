import { Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getStarredFiles } from "./api/getFiles";
import { withGoogleAuth } from "./components/withGoogleAuth";
import { getFileIconLink } from "./helpers/files";
import { createDocFromUrl } from "./helpers/docs";

function StarredFiles() {
  const { data, isLoading } = useCachedPromise(async () => {
    try {
      return await getStarredFiles();
    } catch (error) {
      console.error(error);
      throw error;
    }
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
              alternate={
                <MenuBarExtra.Item
                  title="Open Starred Files in Raycast"
                  icon={Icon.RaycastLogoPos}
                  onAction={() => launchCommand({ name: "starred-google-drive-files", type: LaunchType.UserInitiated })}
                />
              }
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

          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Create Google Document"
              icon="google-docs.png"
              onAction={() => createDocFromUrl("document")}
            />
            <MenuBarExtra.Item
              title="Create Google Spreadsheet"
              icon="google-sheets.png"
              onAction={() => createDocFromUrl("spreadsheets")}
            />
            <MenuBarExtra.Item
              title="Create Google Presentation"
              icon="google-slides.png"
              onAction={() => createDocFromUrl("presentation")}
            />
            <MenuBarExtra.Item
              title="Create Google Form"
              icon="google-forms.png"
              onAction={() => createDocFromUrl("forms")}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <MenuBarExtra.Item title="No starred files" />
      )}
    </MenuBarExtra>
  );
}

export default withGoogleAuth(StarredFiles);
