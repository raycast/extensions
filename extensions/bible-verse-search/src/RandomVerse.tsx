import { Detail, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

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

export default function RandomVerseDetail({ setRandomVerse }: { setRandomVerse: (verse: Verse) => void }) {
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
          setRandomVerse(fetchedVerse);
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
