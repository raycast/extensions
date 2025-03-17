import { Action, ActionPanel, Grid, Icon, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CardDetailView } from "./components/card-detail-view";
import { Card, ClassName } from "./types/types";
import { getLocalCardData } from "./utils/utils";

export default function CardListCommand() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchByCost, setSearchByCost] = useState<string>("all");
  const [language, setLanguage] = useState<"enUS" | "zhCN">("enUS");
  const [searchByClass, setSearchByClass] = useState<string>("all");
  const [searchBySet, setSearchBySet] = useState<string>("all");
  const [allCardData, setAllCardData] = useState<Card[]>([]);
  const [uniqueSets, setUniqueSets] = useState<string[]>(["all"]);

  // For paging and loading more
  const [visibleCount, setVisibleCount] = useState(10);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [hasMoreCards, setHasMoreCards] = useState(false);

  const INITIAL_PAGE_SIZE = 10;
  const LOAD_MORE_SIZE = 10;

  const classes = ["all", ...Object.values(ClassName), "NEUTRAL"];

  useEffect(() => {
    const loadAllCardData = async () => {
      try {
        setIsLoading(true);
        const data = await getLocalCardData(language);

        setAllCardData(data);

        // Extract unique card set
        const cardSets = data
          .map((card: Card) => card.set)
          .filter(
            (set: string | undefined): set is string =>
              typeof set === "string" && set.length > 0,
          );

        const uniqueSetValues = [
          "all",
          ...Array.from(new Set<string>(cardSets)),
        ];
        setUniqueSets(uniqueSetValues);

        // Load only collectible cards
        const collectibleCards = data.filter((card: Card) => card.collectible);
        setFilteredCards(collectibleCards);
        setCards(collectibleCards.slice(0, INITIAL_PAGE_SIZE));
        setHasMoreCards(collectibleCards.length > INITIAL_PAGE_SIZE);

        setIsLoading(false);
      } catch (error) {
        showFailureToast(error, { title: "Error loading card data" });
      } finally {
        setIsLoading(false);
      }
    };

    loadAllCardData();
  }, [language]);

  // Handling filter changes
  useEffect(() => {
    if (allCardData.length === 0) return;

    setIsLoading(true);

    try {
      let newFilteredCards = allCardData.filter(
        (card: Card) => card.collectible,
      );

      if (searchTerm) {
        newFilteredCards = newFilteredCards.filter((card) =>
          card.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
      }

      if (searchByCost !== "all") {
        newFilteredCards = newFilteredCards.filter((card) => {
          // Handle the case where card.cost may be undefined
          const cost = card.cost ?? 0;

          if (searchByCost === ">10") {
            return cost > 10;
          }
          return cost === parseInt(searchByCost, 10);
        });
      }

      if (searchByClass !== "all") {
        newFilteredCards = newFilteredCards.filter((card) => {
          if (searchByClass === "NEUTRAL") {
            return card.cardClass === "NEUTRAL";
          }
          return card.cardClass?.toUpperCase() === searchByClass.toUpperCase();
        });
      }

      if (searchBySet !== "all") {
        newFilteredCards = newFilteredCards.filter(
          (card) => card.set === searchBySet,
        );
      }

      setFilteredCards(newFilteredCards);

      // Reset visible count and display initial cards
      setVisibleCount(INITIAL_PAGE_SIZE);
      setCards(newFilteredCards.slice(0, INITIAL_PAGE_SIZE));
      setHasMoreCards(newFilteredCards.length > INITIAL_PAGE_SIZE);
    } catch (error) {
      showFailureToast(error, { title: "Error applying filters" });
    } finally {
      setIsLoading(false);
    }
  }, [allCardData, searchTerm, searchByCost, searchByClass, searchBySet]);

  const handleFilterChange = (value: string) => {
    const parts = value.split("_");
    const newLanguage = parts[0] as "enUS" | "zhCN";
    const filterType = parts[1];
    const filterValue = parts.slice(2).join("_");

    if (newLanguage !== language) {
      setLanguage(newLanguage);
      return;
    }

    switch (filterType) {
      case "cost":
        setSearchByCost(filterValue);
        break;
      case "class":
        setSearchByClass(filterValue);
        break;
      case "set":
        setSearchBySet(filterValue);
        break;
    }
  };

  // Load more cards (do not close window)
  const loadMoreCards = () => {
    if (hasMoreCards && !isLoading) {
      const newVisibleCount = visibleCount + LOAD_MORE_SIZE;
      setVisibleCount(newVisibleCount);
      setCards(filteredCards.slice(0, newVisibleCount));
      setHasMoreCards(filteredCards.length > newVisibleCount);
      showToast({ title: "Load More...", message: "More cards loaded" });
    }
  };

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      searchText={searchTerm}
      onSearchTextChange={setSearchTerm}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select Filters" onChange={handleFilterChange}>
          <Grid.Dropdown.Section title="Language">
            <Grid.Dropdown.Item title="English" value={`enUS_lang_`} />
            <Grid.Dropdown.Item title="Chinese" value={`zhCN_lang_`} />
          </Grid.Dropdown.Section>

          <Grid.Dropdown.Section title="Mana Cost">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ">10", "all"].map((cost) => (
              <Grid.Dropdown.Item
                key={`cost_${cost}`}
                title={
                  cost === "all"
                    ? "All Costs"
                    : cost === ">10"
                      ? "Cost > 10"
                      : `Cost ${cost}`
                }
                value={`${language}_cost_${cost}`}
              />
            ))}
          </Grid.Dropdown.Section>

          <Grid.Dropdown.Section title="Card Class">
            {classes.map((className) => (
              <Grid.Dropdown.Item
                key={`class_${className}`}
                title={className === "all" ? "All Classes" : className}
                value={`${language}_class_${className}`}
              />
            ))}
          </Grid.Dropdown.Section>

          <Grid.Dropdown.Section title="Card Set">
            {uniqueSets.map((set) => (
              <Grid.Dropdown.Item
                key={`set_${set}`}
                title={set === "all" ? "All Sets" : set}
                value={`${language}_set_${set}`}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      actions={
        hasMoreCards ? (
          <ActionPanel>
            <Action
              title="Load More Cards"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
              onAction={() => {
                loadMoreCards();
                return { keepWindowOpen: true };
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {cards.length === 0 && !isLoading ? (
        <Grid.EmptyView
          title="No cards found"
          description="Try changing your search criteria or filter settings"
          icon={{ source: Icon.XMarkCircle }}
        />
      ) : (
        cards.map((card) => (
          <Grid.Item
            key={card.id || card.dbfId || `card-${card.name}-${card.cost}`}
            title={card.name}
            subtitle={`Cost: ${card.cost}`}
            content={
              card.id
                ? `https://art.hearthstonejson.com/v1/render/latest/${language}/256x/${card.id}.png`
                : Icon.QuestionMark
            }
            actions={
              <ActionPanel>
                {/* 详情查看 */}
                <Action.Push
                  title="View Card Details"
                  target={
                    <CardDetailView
                      slot={{
                        card: {
                          id: card.id,
                          name: card.name,
                          cost: card.cost,
                          mana: card.mana,
                          rarity: card.rarity,
                          collectible: card.collectible,
                          dbfId: card.dbfId,
                        },
                        amount: 1,
                      }}
                      card={card}
                      deckCode=""
                      language={language}
                    />
                  }
                />

                {/* The operation of loading more cards is also added to the ActionPanel of each card */}
                {hasMoreCards && (
                  <Action
                    title="Load More Cards"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    onAction={() => {
                      loadMoreCards();
                      return { keepWindowOpen: true };
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}

      {/* Remove the separate "Load More Cards" grid item */}
    </Grid>
  );
}
