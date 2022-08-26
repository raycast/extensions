import Service from "../api/service";
import {Detail} from "@raycast/api";
import { useEffect, useState } from "react";
import {formatTables, stripFrontmatter, stripTemplateTags} from "../utils";


interface SheetProps {
  slug: string;
}


export function SheetView(props: SheetProps) {
  const [sheet, setSheet] = useState("");
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSheet() {
      const sheetMarkdown = await Service.getSheet(props.slug);
      const sheet = formatTables(stripTemplateTags(stripFrontmatter(sheetMarkdown)));


      setSheet(sheet);
      setLoading(false);
    }

    fetchSheet();
  }, []);

  return <Detail isLoading={isLoading} markdown={sheet} />;
}