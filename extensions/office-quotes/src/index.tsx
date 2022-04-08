import { useEffect, useState } from "react";

import { Detail } from "@raycast/api";
import axios from "axios";

interface OfficeCharacter {
  firstname: string;
  lastname: string;
}

interface OfficeQuote {
  content: string;
  character: OfficeCharacter;
}

export default function main() {
  const [quote, setQuote] = useState<OfficeQuote>();

  useEffect(() => {
    axios.get("https://officeapi.dev/api/quotes/random").then((localQuote) => {
      setQuote(localQuote.data.data);
    });
  }, []);

  return (
    <Detail
      markdown={
        quote ? `${quote.content} - ${quote.character.firstname} ${quote.character.lastname}` : "Loading quote..."
      }
    />
  );
}
