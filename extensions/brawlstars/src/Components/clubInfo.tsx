import { useEffect, useState } from "react";
import { searchClub } from "../Utils/clubUtils";
import { Action, ActionPanel, Detail, Icon, LaunchType, List } from "@raycast/api";
import PlayerComponent from "./PlayerInfo";
import { IClubData } from "../models/IClubData";

interface IClubIdProps {
  id: string;
}

const ClubComponent = ({ id }: IClubIdProps) => {
  const [clubData, setclubData] = useState<IClubData>();

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchclubData = async () => {
      try {
        const data = await searchClub(id);
        setclubData(data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchclubData();
  }, []);

  if (!clubData) {
    return (
      <List onSearchTextChange={setSearchText}>
        <List.EmptyView icon={Icon.CircleProgress} title="Loading Club Data" description="Work in progress." />
      </List>
    );
  }

  if (clubData.name == "") {
    return (
      <List onSearchTextChange={setSearchText}>
        <List.EmptyView
          description="Try With Another Club Id."
          icon={Icon.TwoPeople}
          title="No Club Found"
          actions={
            <ActionPanel>
              <Action.Push title="Show Club" icon={Icon.Sidebar} target={<ClubComponent id={"" + searchText} />} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

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
                  {clubData.members.map((member: any) => (
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
                            target={<PlayerComponent id={member.tag.replace("#", "")} />}
                          />
                        </ActionPanel>
                      }
                    />
                  ))}
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
};

export default ClubComponent;
