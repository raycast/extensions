import { List, Detail, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

const STEAM_CDN_URL = "https://cdn.cloudflare.steamstatic.com";

interface Hero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: string;
  attack_type: string;
  roles: string[];
  img: string;
  icon: string;
  base_health: number;
  base_mana: number;
  base_armor: number;
  base_str: number;
  base_agi: number;
  base_int: number;
  move_speed: number;
}

export default function Command() {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);

  useEffect(() => {
    async function fetchHeroes() {
      try {
        const response = await fetch("https://api.opendota.com/api/heroStats");
        const data = await response.json();
        if (
          Array.isArray(data) &&
          data.every((item) => typeof item.id === "number" && typeof item.localized_name === "string")
        ) {
          setHeroes(data as Hero[]);
        }
      } catch (error) {
        console.error("Error fetching heroes:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHeroes();
  }, []);

  if (selectedHero) {
    return (
      <Detail
        navigationTitle={selectedHero.localized_name}
        markdown={`
# ${selectedHero.localized_name}
![Hero](${STEAM_CDN_URL}${selectedHero.img})

## Attributes
- Primary: ${selectedHero.primary_attr.toUpperCase()}
- Attack Type: ${selectedHero.attack_type}
- Roles: ${selectedHero.roles.join(", ")}

## Base Stats
- Health: ${selectedHero.base_health}
- Mana: ${selectedHero.base_mana}
- Armor: ${selectedHero.base_armor}
- Strength: ${selectedHero.base_str}
- Agility: ${selectedHero.base_agi}
- Intelligence: ${selectedHero.base_int}
- Movement Speed: ${selectedHero.move_speed}
        `}
        actions={
          <ActionPanel>
            <Action
              title="Back to Heroes List"
              onAction={() => setSelectedHero(null)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search heroes...">
      {heroes.map((hero) => (
        <List.Item
          key={hero.id}
          icon={{ source: `${STEAM_CDN_URL}${hero.icon}` }}
          title={hero.localized_name}
          subtitle={hero.roles.join(", ")}
          accessories={[{ text: hero.primary_attr.toUpperCase() }, { text: hero.attack_type }]}
          actions={
            <ActionPanel>
              <Action title="Show Details" onAction={() => setSelectedHero(hero)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
