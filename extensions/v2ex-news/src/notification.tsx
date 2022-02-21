import { ActionPanel, confirmAlert, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { invalidTokenHelper, isInvalidToken, v2exCli } from "@/api";
import { Notification } from "@chyroc/v2ex-api";
import { stripHtml } from "string-strip-html";
import { InvalidToken, NextPageAction, PreviousPageAction } from "@/components";
import { cmdD } from "@/shortcut";

export default () => {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [invalidToken, setInvalidToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const f = async () => {
      try {
        setLoading(true);
        const res = await v2exCli.getNotifications({ page });
        setLoading(false);
        console.log(res);
        setTotal(res.total);
        setNotifications(res.notifications);
      } catch (e) {
        setLoading(false);
        console.error(e);
        if (isInvalidToken(e)) {
          setInvalidToken(true);
          await showToast(Toast.Style.Failure, "request fail", invalidTokenHelper);
        }
        await showToast(Toast.Style.Failure, "request fail", `${e}`);
      }
    };
    f();
  }, [page]);

  if (invalidToken) {
    return <InvalidToken />;
  }

  return (
    <List throttle={true} isLoading={loading}>
      {notifications && notifications.length > 0 && (
        <List.Section title={`Notification | Page ${page} | Total ${total}`}>
          {notifications.map((v) => {
            return (
              <List.Item
                title={stripHtml(v.text).result}
                key={v.id}
                actions={
                  <ActionPanel>
                    {page >= 2 && <PreviousPageAction onSelect={() => setPage(page - 1)} />}
                    {total > page * 10 && <NextPageAction onSelect={() => setPage(page + 1)} />}
                    <ActionPanel.Item
                      icon={cmdD.icon}
                      title={cmdD.title}
                      shortcut={cmdD.key}
                      onAction={async () => {
                        const confirm = await confirmAlert({
                          title: "Delete?",
                          message: stripHtml(v.text).result,
                        });
                        if (confirm) {
                          try {
                            await v2exCli.deleteNotification({ notificationID: v.id });
                          } catch (e) {
                            console.error(e);
                            await showToast(Toast.Style.Failure, "request fail", `${e}`);
                          }
                        }
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
};
