import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import moment from "moment";
import { flag } from "country-emoji";
import { useState } from "react";
import useTopScorers from "./hooks/useTopScorers";

function getAge(date: string | undefined) {
  if (!date) return "Unknown";
  const birthDate = moment(date, "YYYY-MM-DD");
  const currentDate = moment();
  const age = currentDate.diff(birthDate, "years");
  return age.toString();
}

function getFormattedDate(date: string | undefined) {
  if (!date) return "Unknown";
  const parsedDate = moment(date, "YYYY-MM-DD");
  const formattedDate = parsedDate.format("D MMMM YYYY");
  return formattedDate.toString();
}

function getCountryDescription(countryName: string | undefined) {
  if (countryName == undefined) {
    return "?";
  }

  return countryName + " " + flag(countryName);
}

export default function GetTopScorers() {
  const topScorers = useTopScorers();
  const [showDetails, setShowDetails] = useState<boolean>(false);
  let position = 0;

  return (
    <List isLoading={!topScorers} filtering={false} isShowingDetail={showDetails}>
      {topScorers?.map((ts) => {
        position += 1;
        return (
          <List.Item
            key={ts.player.name}
            title={position.toString()}
            subtitle={ts.player.name.toString()}
            icon={{
              source: `${ts.team.crest}`,
              mask: Image.Mask.Circle,
              fallback: "default.png",
            }}
            accessories={[{ text: ts.goals.toString() }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Details" />
                    <List.Item.Detail.Metadata.Label title="Name" text={ts.player.name} />
                    <List.Item.Detail.Metadata.Label
                      title="Nationality"
                      text={getCountryDescription(ts.player.nationality)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Date of Birth"
                      text={getFormattedDate(ts.player.dateOfBirth)}
                    />
                    <List.Item.Detail.Metadata.Label title="Age" text={getAge(ts.player.dateOfBirth) + " years old"} />
                    <List.Item.Detail.Metadata.Label title="Penalties" text={(ts.penalties || 0).toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={showDetails ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  onAction={() => setShowDetails(!showDetails)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
