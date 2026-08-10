import { ActionPanel, Action, Detail, Icon } from "@raycast/api";
import { IPlayerData } from "../models/IPlayerData";
import ClubComponent from "./clubInfo";

interface IPlayerProps {
  playerData: IPlayerData;
}

export default function Player({ playerData }: IPlayerProps) {
  const clubInfo = playerData.club.name ? playerData.club.name + " " + playerData.club.tag : "Not in a Club";
  const markdown = `

  # ${playerData.name} ${playerData.tag}

  <img src="https://cdn-old.brawlify.com/profile/${playerData.icon.id}.png"  width="100" height="100" /> 

  ## Experience Level   ${playerData.expLevel}  

  |Club   | Trophies  |
  |---|---|
  |  ${clubInfo} |   ${playerData.trophies} / ${playerData.highestTrophies} max|

 
  
  `;
  return (
    <>
      <Detail
        markdown={markdown}
        navigationTitle={"Player Info | " + playerData.name}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Wins">
              <Detail.Metadata.TagList.Item
                icon={Icon.Crown}
                text={"Solo " + playerData["soloVictories"]}
                color={"#aae900"}
              />
              <Detail.Metadata.TagList.Item
                icon={Icon.Crown}
                text={"Duo " + playerData["duoVictories"]}
                color={"#00FFFF"}
              />
              <Detail.Metadata.TagList.Item
                icon={Icon.Crown}
                text={"3vs3 " + playerData["3vs3Victories"]}
                color={"#eed535"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Best Robo Rumble Time" text={playerData["bestRoboRumbleTime"] + " s"} />
            <Detail.Metadata.Label title="Best Time As Big Brawler" text={playerData["bestTimeAsBigBrawler"] + " s"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="More info"
              target={"https://brawlify.com/stats/profile/" + playerData.tag.replace("#", "%23")}
              text={playerData.name}
            />
          </Detail.Metadata>
        }
        actions={
          playerData.club.tag ? (
            <ActionPanel>
              <Action.Push
                title="Show Club"
                icon={Icon.Sidebar}
                target={playerData.club ? <ClubComponent id={playerData.club.tag.replace("#", "")} /> : ""}
              />
              <Action.OpenInBrowser
                title="Open in Brawlify"
                icon={Icon.Globe}
                url={"https://brawlify.com/stats/profile/" + playerData.tag.replace("#", "%23")}
              />
            </ActionPanel>
          ) : (
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Brawlify"
                icon={Icon.Globe}
                url={"https://brawlify.com/stats/profile/" + playerData.tag.replace("#", "%23")}
              />
            </ActionPanel>
          )
        }
      />
    </>
  );
}
