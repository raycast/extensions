import { useEffect, useState } from "react";
import { Detail, popToRoot, showToast, Toast } from "@raycast/api";

interface Verse {
  reference: string;
  text: string;
}

export default function Command() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVerse() {
      try {
        const res = await fetch("https://bible-api.com/?random=verse");
        if (!res.ok) throw new Error("Failed to fetch verse");
        const data = await res.json();
        setVerse({ reference: data.reference, text: data.text.trim() });
      } catch (err) {
        console.error(err);
        showToast(Toast.Style.Failure, "Failed to fetch verse");
      } finally {
        setLoading(false);
        setTimeout(() => {
          popToRoot(); // goes back to Root
        }, 8000);
      }
    }

    fetchVerse();
  }, []);

  if (loading) {
    return <Detail markdown="⌛ Fetching a random verse..." />;
  }

  if (!verse) {
    return <Detail markdown="⚠️ Could not load verse." />;
  }

  return <Detail markdown={`### ${verse.reference}\n\n${verse.text}`} />;
}
