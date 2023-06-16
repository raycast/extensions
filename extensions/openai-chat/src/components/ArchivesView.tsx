import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import dayjs from "dayjs";
import { formatContent } from "../utils";
import { useContext } from "react";
import { IndexContext } from "../context";

function EmptyItem(props: { toggleMainView: () => void }) {
  return (
    <List.Item
      title={"Archives is Empty"}
      actions={
        <ActionPanel>
          <Action title="Toggle Close Archives" icon={Icon.Reply} onAction={props.toggleMainView}></Action>
        </ActionPanel>
      }
    ></List.Item>
  );
}

export function ArchivesView(props: { toggleMainView: () => void }) {
  const { histories, archives, handleSetHistories, setArchives } = useContext(IndexContext);

  return (
    <>
      {archives.length ? (
        archives?.map((archive) => (
          <List.Item
            title={archive.archiveHistory[0].prompt}
            subtitle={dayjs(archive.date).format("YY/MM/DD HH:mm:ss")}
            detail={<List.Item.Detail markdown={formatContent(archive.archiveHistory)} />}
            actions={
              <ActionPanel>
                <Action
                  title="Load Archive"
                  icon={Icon.RotateAntiClockwise}
                  onAction={() => {
                    const newHistories = archive.archiveHistory;
                    handleSetHistories(newHistories);

                    const newArchies = archives.filter((item) => item.date !== archive.date);
                    setArchives(
                      [
                        {
                          date: dayjs().valueOf(),
                          archiveHistory: histories,
                        },
                        ...newArchies,
                      ].filter((item) => item.archiveHistory[0].prompt !== "")
                    );

                    showToast({ style: Toast.Style.Success, title: "Load Sucess" });
                    props.toggleMainView();
                  }}
                ></Action>
                <Action
                  title="Delete Archive"
                  icon={Icon.Trash}
                  onAction={() => {
                    const newArchies = archives.filter((item) => item.date !== archive.date);
                    setArchives(newArchies);

                    showToast({ style: Toast.Style.Success, title: "Delete Sucess" });
                  }}
                ></Action>
                <Action
                  title="Toggle Close Archives"
                  icon={Icon.Reply}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={props.toggleMainView}
                ></Action>
              </ActionPanel>
            }
          ></List.Item>
        ))
      ) : (
        <EmptyItem toggleMainView={props.toggleMainView} />
      )}
    </>
  );
}
