import { Action, ActionPanel, Grid, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDraw } from "./hooks/useDraw";
import { PrimaryAction } from "./actions";
import { PreferencesActionSection } from "./actions/preferences";
import { EmptyView } from "./views/empty";
import { downloadFile, getDownloadFolder } from "./utils";
import path from "path";
import fs from "fs";

export default function Draw() {
  const [searchText, setSearchText] = useState("");
  const draws = useDraw();

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Zero}
      filtering={false}
      isLoading={draws.isLoading}
      throttle={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Create Images"
      searchBarPlaceholder="Create images with AI"
      actions={
        !searchText ? null : (
          <ActionPanel>
            <PrimaryAction title="Create Images" onAction={() => draws.ask(searchText)} />
            <PreferencesActionSection />
          </ActionPanel>
        )
      }
    >
      {draws.data.length > 0 ? (
        <>
          {draws.data.map((item2) => (
            <>
              {item2.answer.map((item) => (
                <Grid.Item
                  key={item.url}
                  content={item.url}
                  keywords={[item.url]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={"Save Image"}
                        onAction={async () => {
                          try {
                            const toast = await showToast({
                              title: "Start save image...",
                              style: Toast.Style.Animated,
                            });
                            const downloadFolder = getDownloadFolder();
                            const imgDir = path.join(downloadFolder, "ChatGoImages");
                            fs.mkdir(imgDir, { recursive: true }, () => {
                              //
                            });
                            const imgFilePath = path.join(
                              imgDir,
                              `img_${item2.question}_${item2.size}_${uuidv4()}.png`
                            );
                            await downloadFile(item.url, { localFilepath: imgFilePath });
                            toast.title = `Save image success to ${imgDir}`;
                            toast.style = Toast.Style.Success;
                            // await showHUD(`Image is Save to ${imgDir}`);
                          } catch (e) {
                            console.log("e", e);
                          }
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </>
          ))}
        </>
      ) : (
        <EmptyView />
      )}
    </Grid>
  );
}
