// src/index.tsx

import { ActionPanel, Action, Icon, List, Detail, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import axios from "axios";

// Define interfaces for type safety
interface Verse {
  verse: number;
  text: string;
  reference: string; // Added reference to Verse
}

interface BibleResponse {
  reference: string;
  verses: Verse[];
  text: string;
}

// Fetcher function using axios
const fetcher = (url: string) =>
  axios
    .get<BibleResponse>(url)
    .then((res) => {
      // console.log("Response:", res.data);
      return res.data;
    })
    .catch((error) => {
      console.error("Error:", error);
      // throw error;
    });

// Detail View Component
function VerseDetail({ reference, verse, text }: { reference: string; verse: number; text: string }) {
  const markdown = `# ${reference} - Verse ${verse}\n\n${text.replace(/\n/g, "  \n")}`; // '  \n' adds a line break in Markdown

  return <Detail markdown={markdown} />;
}

export function RandomVerseDetail() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [reference, setReference] = useState<string>("");
  const hasFetchedRandomVerse = useRef(false);

  useEffect(() => {
    if (hasFetchedRandomVerse.current) return;
    hasFetchedRandomVerse.current = true;

    // console.log("Component mounted");
    const fetchRandomVerse = async () => {
      try {
        // Display searching message
        setVerse(null);
        // Assuming the API supports a random verse query parameter
        const response = await axios.get<BibleResponse>(`https://bible-api.com/?random=verse`);
        // console.log("Random Verse Response:", response.data);
        if (response.data.verses.length > 0) {
          const fetchedVerse = response.data.verses[0];
          setVerse(fetchedVerse);
          setReference(response.data.reference);
        } else {
          showToast(Toast.Style.Failure, "No verses found.", "Try fetching another random verse.");
        }
      } catch (error) {
        console.error("Error fetching random verse:", error);
        showToast(Toast.Style.Failure, "Failed to fetch random verse.");
      }
    };

    fetchRandomVerse();
  }, []);

  if (!verse) {
    return <Detail isLoading={true} />;
  }

  const markdown = `# ${reference} - Verse ${verse.verse}\n\n${verse.text.replace(/\n/g, "  \n")}`; // '  \n' adds a line break in Markdown

  return <Detail markdown={markdown} />;
}

// Main Command Component
export default function Command() {
  const [query, setQuery] = useState<string>("");
  const [favorites, setFavorites] = useState<Verse[]>([]);

  // Function to load favorites from local storage
  const loadFavorites = async (): Promise<Verse[]> => {
    const storedFavorites = await LocalStorage.getItem<string>("favorites");
    if (storedFavorites) {
      return JSON.parse(storedFavorites) as Verse[];
    }
    return [];
  };

  // Function to save favorites to local storage
  const saveFavorites = async (favorites: Verse[]) => {
    await LocalStorage.setItem("favorites", JSON.stringify(favorites));
  };

  // Load favorites from local storage on mount
  useEffect(() => {
    const initializeFavorites = async () => {
      const storedFavorites = await loadFavorites();
      setFavorites(storedFavorites);
    };
    initializeFavorites();
  }, []);

  // SWR for data fetching
  const { data, error, isLoading } = useSWR<BibleResponse>(
    query === "random"
      ? `https://bible-api.com/?random=verse`
      : query
        ? `https://bible-api.com/${encodeURIComponent(query)}`
        : null,
    fetcher,
  );

  // Handle errors
  if (error) {
    console.log("Error:", error);
    let message = "Failed to fetch verse.";
    if (axios.isAxiosError(error)) {
      if (error.response) {
        message = `Error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        message = "No response received from the server.";
      } else {
        message = error.message;
      }
    }
    showToast(Toast.Style.Failure, message);
    return (
      <List>
        <List.Item title="Error fetching verse." />
      </List>
    );
  }

  // Function to add a verse to favorites
  const addToFavorites = async (verse: Verse, reference: string) => {
    try {
      const newFavorite = { ...verse, reference };
      const updatedFavorites = [...favorites, newFavorite];
      await saveFavorites(updatedFavorites);
      setFavorites(updatedFavorites);
      showToast(Toast.Style.Success, "Verse added to favorites.");
    } catch (error) {
      console.error("Failed to add favorite:", error);
      showToast(Toast.Style.Failure, "Failed to add verse to favorites.");
    }
  };

  // Function to remove a verse from favorites
  const removeFromFavorites = async (verse: Verse, reference: string) => {
    try {
      const updatedFavorites = favorites.filter(
        (fav) => !(fav.verse === verse.verse && fav.text === verse.text && fav.reference === reference),
      );
      await saveFavorites(updatedFavorites);
      setFavorites(updatedFavorites);
      showToast(Toast.Style.Success, "Verse removed from favorites.");
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      showToast(Toast.Style.Failure, "Failed to remove verse from favorites.");
    }
  };

  // Render the List
  return (
    <List
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Enter book, chapter and verse (e.g., John 3:16) or type 'random'"
      isLoading={isLoading}
    >
      {data ? (
        data.verses.length > 0 ? (
          data.verses.map((verse) => (
            <List.Item
              key={`${data.reference}-${verse.verse}`} // Unique key combining reference and verse
              icon={Icon.Bird}
              title={`Verse ${verse.verse}`}
              subtitle={verse.text.length > 50 ? verse.text.substring(0, 50) + "..." : verse.text}
              accessories={[
                {
                  icon: Icon.Text,
                  text: "Copy",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Full Verse"
                    target={<VerseDetail reference={data.reference} verse={verse.verse} text={verse.text} />}
                  />
                  <Action.CopyToClipboard
                    content={`${data.reference} - Verse ${verse.verse}: ${verse.text}`}
                    title="Copy Verse"
                  />
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Star}
                    onAction={() => addToFavorites(verse, data.reference)}
                  />
                  {/* <Action.OpenInBrowser
                    url={`https://bible-api.com/${encodeURIComponent(
                      query
                    )}`}
                    title="Open in Bible API"
                  /> */}
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item title="No verses found for the given reference." />
        )
      ) : (
        <List.Item title="Type to search for a Bible verse" />
      )}
      {favorites.length > 0 && (
        <List.Section title="Favorites">
          {favorites.map((verse, index) => (
            <List.Item
              key={`favorite-${verse.reference}-${verse.verse}-${index}`}
              icon={Icon.Star}
              title={`${verse.reference} - Verse ${verse.verse}`}
              subtitle={verse.text.length > 50 ? verse.text.substring(0, 50) + "..." : verse.text}
              accessories={[
                {
                  icon: Icon.Text,
                  text: "Copy",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Full Verse"
                    target={<VerseDetail reference={verse.reference} verse={verse.verse} text={verse.text} />}
                  />
                  <Action.CopyToClipboard
                    content={`${verse.reference} - Verse ${verse.verse}: ${verse.text}`}
                    title="Copy Verse"
                  />
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.Trash}
                    onAction={() => removeFromFavorites(verse, verse.reference)}
                  />
                  {/* <Action.OpenInBrowser
                    url={`https://bible-api.com/${encodeURIComponent(
                      verse.reference
                    )}`}
                    title="Open in Bible API"
                  /> */}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Random Verse">
        <List.Item
          key="random-verse"
          icon={Icon.QuestionMark}
          title="Get a Random Verse"
          actions={
            <ActionPanel>
              <Action.Push title="Fetch Random Verse" icon={Icon.QuestionMark} target={<RandomVerseDetail />} />
            </ActionPanel>
          }
        />
      </List.Section>
      {randomVerse && <VerseDetail reference={randomReference} verse={randomVerse.verse} text={randomVerse.text} />}
    </List>
  );
}
