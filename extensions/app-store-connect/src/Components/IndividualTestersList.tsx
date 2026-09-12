import { List, ActionPanel, Action, confirmAlert, Alert, Icon, Keyboard } from "@raycast/api";
import { fetchAppStoreConnect, useAppStoreConnectApi } from "../Hooks/useAppStoreConnect";
import { betaTesterDisplayName } from "../Utils/testers";
import { presentError } from "../Utils/utils";
import { App, BuildWithBetaDetailAndBetaGroups, betaTestersSchema } from "../Model/schemas";
import { BetaTester } from "../Model/schemas";
import { useEffect, useState } from "react";
import AddIndividualTester from "./AddIndividualTester";

interface UpdateIndividualTestersProps {
  build: BuildWithBetaDetailAndBetaGroups;
  app: App;
}

export default function IndividualTestersList({ build, app }: UpdateIndividualTestersProps) {
  const { data, isLoading } = useAppStoreConnectApi(`/builds/${build.build.id}/individualTesters`, (response) => {
    return betaTestersSchema.safeParse(response.data).data ?? null;
  });
  const [testers, setTesters] = useState<BetaTester[]>([]);

  useEffect(() => {
    setTesters(data || []);
  }, [data]);

  const copyAction = (user: BetaTester) => {
    return (
      <>
        <Action.CopyToClipboard
          title="Copy Name"
          shortcut={Keyboard.Shortcut.Common.Copy}
          content={user.attributes.firstName + " " + user.attributes.lastName}
        />
        <Action.CopyToClipboard
          title="Copy Email"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          content={user.attributes.email ?? ""}
        />
      </>
    );
  };

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add New Testers"
            icon={Icon.AddPerson}
            target={
              <AddIndividualTester
                app={app}
                build={build}
                didUpdateExistingTesters={(newTesters) => {
                  setTesters(testers.concat(newTesters));
                }}
                didUpdateNewTesters={(newTesters) => {
                  setTesters(testers.concat(newTesters));
                }}
              />
            }
          />
        </ActionPanel>
      }
    >
      {testers.map((tester) => (
        <List.Item
          key={tester.id}
          title={betaTesterDisplayName(tester)}
          subtitle={tester.attributes.email || ""}
          accessories={[{ text: tester.attributes.state }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title={betaTesterDisplayName(tester)}>
                {copyAction(tester)}
                <Action
                  title="Remove Tester"
                  icon={Icon.Trash}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  onAction={() => {
                    (async () => {
                      if (
                        await confirmAlert({
                          title: "Are you sure?",
                          primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        // Optimistic: restore the row if the request fails, and catch so
                        // the rejection cannot escape this fire-and-forget handler.
                        const previousTesters = testers;
                        setTesters(testers.filter((t) => t.id !== tester.id));
                        try {
                          await fetchAppStoreConnect(`/betaTesters/${tester.id}/relationships/builds`, "DELETE", {
                            data: [
                              {
                                type: "builds",
                                id: build.build.id,
                              },
                            ],
                          });
                        } catch (error) {
                          setTesters(previousTesters);
                          presentError(error);
                        }
                      }
                    })();
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Add New Testers"
                  icon={Icon.AddPerson}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={
                    <AddIndividualTester
                      app={app}
                      build={build}
                      didUpdateExistingTesters={(newTesters) => {
                        setTesters(testers.concat(newTesters));
                      }}
                      didUpdateNewTesters={(newTesters) => {
                        setTesters(testers.concat(newTesters));
                      }}
                    />
                  }
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
