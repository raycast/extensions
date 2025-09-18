import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import React, { useState, useEffect } from "react";
import * as cheerio from "cheerio";

// --- Helper function to get class color ---
function getClassColor(className) {
  const colors = {
    "Death Knight": "#C41F3B",
    Warrior: "#C79C6E",
    Paladin: "#F58CBA",
    Hunter: "#ABD473",
    Rogue: "#FFF569",
    Priest: "#FFFFFF",
    Shaman: "#0070DE",
    Mage: "#69CCF0",
    Warlock: "#9482C9",
    Monk: "#00FF96",
    Druid: "#FF7D0A",
    "Demon Hunter": "#A330C9",
    Evoker: "#33937F",
  };
  return colors[className] || "#FFFFFF";
}

// --- Character Detail View Component (Optimized for Memory) ---
function CharacterDetail({ character }) {
  const [raiderData, setRaiderData] = useState(null);
  const [armoryData, setArmoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCharacterDetails() {
      setIsLoading(true);
      try {
        // Fetch both data sources in parallel
        const [raiderResponse, armoryResponse] = await Promise.all([
          fetch(
            `https://raider.io/api/v1/characters/profile?region=us&realm=${character.realm
              .toLowerCase()
              .replace(
                /\s/g,
                "-",
              )}&name=${encodeURIComponent(character.name)}&fields=gear,mythic_plus_scores_by_season:previous:current`,
          ),
          fetch(character.profileUrl),
        ]);

        if (raiderResponse.ok) {
          const raiderJson = await raiderResponse.json();
          setRaiderData(raiderJson);
        } else {
          console.error("Failed to fetch from Raider.io");
        }

        if (armoryResponse.ok) {
          const armoryHtml = await armoryResponse.text();
          // Parse immediately and only store the result to save memory
          const $ = cheerio.load(armoryHtml);
          const scriptContent = $(
            "#character-profile-mount-initial-state",
          ).html();
          if (scriptContent) {
            const match = scriptContent.match(
              /var characterProfileInitialState = ({.*?});/s,
            );
            if (match && match[1]) {
              setArmoryData(JSON.parse(match[1]));
            }
          }
        } else {
          console.error("Failed to fetch from Armory");
        }
      } catch (error) {
        console.error("Failed to fetch character details:", error);
        showToast(
          Toast.Style.Failure,
          "Could Not Load Details",
          "Failed to fetch or parse character data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchCharacterDetails();
  }, [character.profileUrl, character.name, character.realm]);

  const mainImageUrl =
    armoryData?.character?.render?.foreground?.url || raiderData?.thumbnail_url;
  const characterName = raiderData?.name || character.name;
  const characterTitle = `${raiderData?.race || ""} ${raiderData?.class || ""} - ${raiderData?.realm || character.realm}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={mainImageUrl ? `![Character Render](${mainImageUrl})` : ""}
      navigationTitle={`${character.name} - ${character.realm}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="View on Raider.io"
            url={raiderData?.profile_url}
          />
          <Action.OpenInBrowser
            title="View on Armory"
            url={character.profileUrl}
          />
        </ActionPanel>
      }
      metadata={
        !raiderData && !armoryData && !isLoading ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Error"
              text="Failed to load character details."
            />
          </Detail.Metadata>
        ) : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Character" text={characterName} />
            <Detail.Metadata.Label
              title="Class & Realm"
              text={characterTitle}
            />
            <Detail.Metadata.TagList title="Active Spec">
              <Detail.Metadata.TagList.Item
                text={raiderData?.active_spec_name || "N/A"}
                color={getClassColor(raiderData?.class)}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Item Level"
              text={`${raiderData?.gear?.item_level_equipped || "N/A"}`}
            />
            <Detail.Metadata.Label
              title="Achievements"
              text={`${raiderData?.achievement_points || "N/A"}`}
            />
            <Detail.Metadata.Separator />

            {raiderData?.mythic_plus_scores_by_season?.map((season, index) => {
              const seasonName = season.season
                .replace("season-", "")
                .replace(/-/g, " ")
                .replace("tww", "The War Within")
                .toUpperCase();
              return (
                <React.Fragment key={season.season}>
                  <Detail.Metadata.Label title={seasonName} />
                  <Detail.Metadata.Label
                    title="Overall Score"
                    text={`${season.scores.all}`}
                  />
                  <Detail.Metadata.TagList title="Role Scores">
                    <Detail.Metadata.TagList.Item
                      text={`Tank: ${season.scores.tank}`}
                      color={"#4e8ebd"}
                    />
                    <Detail.Metadata.TagList.Item
                      text={`Healer: ${season.scores.healer}`}
                      color={"#4b8bc1"}
                    />
                    <Detail.Metadata.TagList.Item
                      text={`DPS: ${season.scores.dps}`}
                      color={"#715be5"}
                    />
                  </Detail.Metadata.TagList>
                  {index <
                    raiderData.mythic_plus_scores_by_season.length - 1 && (
                    <Detail.Metadata.Separator />
                  )}
                </React.Fragment>
              );
            })}

            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Equipped Gear" />
            {raiderData?.gear?.items ? (
              Object.entries(raiderData.gear.items).map(
                ([slot, item]) =>
                  item && (
                    <Detail.Metadata.Label
                      key={slot}
                      title={slot.charAt(0).toUpperCase() + slot.slice(1)}
                      text={`${item.name} (iLvl ${item.item_level})`}
                    />
                  ),
              )
            ) : (
              <Detail.Metadata.Label
                title="Gear"
                text="No gear data available."
              />
            )}
          </Detail.Metadata>
        )
      }
    />
  );
}

// --- Main Search Command Component ---
export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useFetch(
    `https://worldofwarcraft.blizzard.com/en-us/search?q=${searchText}`,
    {
      execute: searchText.length > 2,
      keepPreviousData: true,
    },
  );

  const parsedCharacters = React.useMemo(() => {
    if (!data) return [];
    try {
      const $ = cheerio.load(data);
      const characters = [];
      $(".Link.Character").each((_, element) => {
        const name = $(element).find(".Character-name").text().trim();
        const realm = $(element).find(".Character-realm").text().trim();
        const levelAndClassText = $(element)
          .find(".Character-level")
          .text()
          .trim();
        const levelMatch = levelAndClassText.match(/\d+/);
        const level = levelMatch ? levelMatch[0] : "";
        const charClass = levelAndClassText.replace(level, "").trim();
        const avatarStyle = $(element).find(".Avatar-image").attr("style");
        const avatarMatch = avatarStyle
          ? avatarStyle.match(/url\("?([^"]+)"?\)/)
          : null;
        const avatarUrl = avatarMatch ? avatarMatch[1] : Icon.Person;
        const profilePath = $(element).attr("href");
        const profileUrl = profilePath
          ? `https://worldofwarcraft.blizzard.com${profilePath}`
          : "";

        if (name && realm && profileUrl) {
          characters.push({
            name,
            realm,
            level,
            charClass,
            avatarUrl,
            profileUrl,
          });
        }
      });
      return characters;
    } catch (error) {
      console.error("Failed to parse HTML:", error);
      return [];
    }
  }, [data]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a WoW character..."
      throttle
    >
      <List.EmptyView
        title="Search for a Character"
        description="Enter a character's name to begin."
      />
      <List.Section
        title="Search Results"
        subtitle={`${parsedCharacters.length} found`}
      >
        {parsedCharacters.map((char) => (
          <List.Item
            key={char.profileUrl}
            title={char.name}
            subtitle={`Level ${char.level} ${char.charClass}`}
            icon={{ source: char.avatarUrl, fallback: Icon.Person }}
            accessories={[{ text: char.realm }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Character Details"
                  target={<CharacterDetail character={char} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
