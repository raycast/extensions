import { Detail } from "@raycast/api"
import { useEffect, useState } from "react";
import fetch from "node-fetch";

// Markdown view


export default function Command() {
  const [markdown, setMarkdown] = useState(`# Loading...`)

  // Fetch word of the day from urban dictionary

  useEffect(() => {
    fetch("https://api.urbandictionary.com/v0/words_of_the_day").then(response => response.json()).then(jsondata => {
      // @ts-ignore
      const wordOfTheDay = jsondata.list[0];
      const title = wordOfTheDay.word;
      let subtitle = wordOfTheDay.definition;
      subtitle = subtitle.replaceAll("[", "").replaceAll("]", "");
      setMarkdown(`# ${title}\n\n${subtitle}`)
    });

    return () => {}
  }, [])
  

  return <Detail markdown={markdown} />
}