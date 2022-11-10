import { BoardMember } from "@mirohq/miro-api";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import ChangeRole from "./change-role";
import { capitalizeFirstLetter } from "./helpers";
import * as miro from "./oauth/miro";

export default function ListMembers({ id }: { id: string }) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const { push, pop } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const boardMembers = await miro.getBoardMembers(id);
        setBoardMembers(boardMembers);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        await showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading}>
      {boardMembers.map((member) => {
        return (
          <List.Item
            key={member.id}
            id={member.id.toString()}
            icon={Icon.Person}
            title={member.name}
            subtitle={member.role ? capitalizeFirstLetter(member.role) : "No role"}
            actions={
              <ActionPanel>
                <Action
                  title="Change role"
                  icon={Icon.PersonCircle}
                  onAction={() => push(<ChangeRole {...{ id, memberId: member.id.toString(), role: member.role }} />)}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
                <Action
                  title={"Remove from board"}
                  icon={Icon.RemovePerson}
                  onAction={async () => {
                    const options: Alert.Options = {
                      title: "Remove Member",
                      message: "Are you sure you want to remove this member?",
                      primaryAction: {
                        title: "Remove",
                        style: Alert.ActionStyle.Destructive,
                        onAction: async () => {
                          try {
                            await miro.removeBoardMember(id, member.id.toString());
                            await showToast({ style: Toast.Style.Success, title: "🎉 Removed member!" });
                            pop();
                          } catch {
                            await showToast({ style: Toast.Style.Failure, title: "Remove member failed." });
                          }
                        },
                      },
                    };
                    await confirmAlert(options);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
