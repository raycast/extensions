import { ActionPanel, Action, Detail, Icon, List } from "@raycast/api";

import { IClubData } from "../models/IClubData";
import PlayerInfo from "./PlayerInfo";

interface IClubProps {
  clubData: IClubData;
}

export default function Club({ clubData }: IClubProps) {
  const markdown = `
  # ${clubData.name} ${clubData.tag}


  <img src="https://cdn-old.brawlify.com/club/${clubData.badgeId}.png"  width="100" height="100" /> 

  
  
  ## Description

  ${clubData.description}
  
  
  `;
  return (
    <>
      <Detail
        markdown={markdown}
        navigationTitle={"Club Info | " + clubData.name}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Type">
              <Detail.Metadata.TagList.Item icon={Icon.Person} text={clubData.type} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Required Trophies">
              <Detail.Metadata.TagList.Item
                icon={Icon.Trophy}
                text={"" + clubData.requiredTrophies}
                color={"#eee900"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Trophies">
              <Detail.Metadata.TagList.Item icon={Icon.Trophy} text={"" + clubData.trophies} color={"#eee900"} />
            </Detail.Metadata.TagList>

            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="More info"
              target={"https://brawlify.com/stats/club/" + clubData.tag.replace("#", "%23")}
              text={clubData.name}
            />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="See Club Members"
              icon={Icon.Person}
              target={
                <List>
                  {clubData.members.map(
                    (member: {
                      icon: {
                        id: number;
                      };
                      tag: string;
                      name: string;
                      trophies: number;
                      role: string;
                      nameColor: string;
                    }) => (
                      <List.Item
                        key={member.tag}
                        title={member.name}
                        subtitle={member.role}
                        icon={{ source: "https://cdn.brawlify.com/profile/" + member.icon.id + ".png" }}
                        keywords={[member.name, member.tag]}
                        actions={
                          <ActionPanel>
                            <Action.Push
                              title="See Player"
                              icon={Icon.Person}
                              target={<PlayerInfo id={member.tag.replace("#", "")} />}
                            />
                          </ActionPanel>
                        }
                      />
                    )
                  )}
                </List>
              }
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
            <Action.OpenInBrowser
              title="Open in Brawlify"
              icon={Icon.Globe}
              url={"https://brawlify.com/stats/club/" + clubData.tag.replace("#", "%23")}
            />
          </ActionPanel>
        }
      />
    </>
  );
}
