import { ActionPanel, List, Action, Icon } from "@raycast/api";

export default function Command() {
  const serverList = [
    {
      name: "BoxBuild Survival",
      icon: Icon.Heart,
      ip: "mc.box-build.com",
      port: 19132,
      desc: "Survival server",
    },
    {
      name: "Steal a mob",
      icon: Icon.Mouse,
      ip: "mc.box-build.com",
      port: 19134,
      desc: "Steal a mob minigame",
    },
    {
      name: "2D Parkour",
      icon: Icon.GameController,
      ip: "mc.box-build.com",
      port: 19136,
      desc: "A parkour but in 2D",
    },
  ];

  return (
    <List>
      {serverList.map((server) => {
        return (
          <List.Item
            icon={server.icon}
            title={server.name}
            actions={
              <ActionPanel>
                <Action.Open
                  title={server.desc}
                  target={`minecraft://connect?serverUrl=${server.ip}&serverPort=${server.port}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
