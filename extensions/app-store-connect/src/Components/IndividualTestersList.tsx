import { List, ActionPanel, Action, confirmAlert, Alert, Icon, Keyboard } from "@raycast/api";
import { fetchAppStoreConnect, useAppStoreConnectApi } from "../Hooks/useAppStoreConnect";
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
          title={tester.attributes.firstName + " " + tester.attributes.lastName}
          subtitle={tester.attributes.email || ""}
          accessories={[{ text: tester.attributes.state }]}
          actions={
            <ActionPanel>
              {copyAction(tester)}
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
              <Action
                title="Remove Tester"
                style={Action.Style.Destructive}
                onAction={() => {
                  (async () => {
                    if (
                      await confirmAlert({
                        title: "Are you sure?",
                        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      setTesters(testers.filter((t) => t.id !== tester.id));
                      await fetchAppStoreConnect(`/betaTesters/${tester.id}/relationships/builds`, "DELETE", {
                        data: [
                          {
                            type: "builds",
                            id: build.build.id,
                          },
                        ],
                      });
                    }
                  })();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
