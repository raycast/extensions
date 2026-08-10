import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

type DefintionList = {
  list: [
    {
      word: string;
      definition: string;
      thumbs_up: number;
      thumbs_down: number;
    }
  ];
};

export default function Command() {
  const [markdown, setMarkdown] = useState(`# Loading...`);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch word of the day from urban dictionary

  useEffect(() => {
    fetch("https://api.urbandictionary.com/v0/random").then(async (response) => {
      const jsondata = (await response.json()) as DefintionList;
      const randomWord = jsondata.list[0];
      const title = randomWord.word;
      let subtitle = randomWord.definition;
      subtitle = subtitle.replaceAll("[", "").replaceAll("]", "");
      setMarkdown(`# ${title}\n\n${subtitle}\n\n\n✅: ${randomWord.thumbs_up} ❌: ${randomWord.thumbs_down}`);
      setIsLoading(false);
    });

    return () => {
      null;
    };
  }, []);

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
