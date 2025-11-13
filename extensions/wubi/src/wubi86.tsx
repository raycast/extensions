import { useEffect, useState } from "react";
import { Grid } from "@raycast/api";
import fetch from "node-fetch";

interface Item {
  K: string;
  V: string[]; // Assuming V is an array of strings; adjust as necessary
}

interface Response {
  content: string[] | Item[];
  flag: number;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [resItems, setResItems] = useState([]);
  const [flag, setFlag] = useState(-1);

  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await fetch(`https://kisstools.com/raycast/search_86?keyword=${searchText}&app_id=HVun9CsH27`);
        const data = (await response.json()) as Response; // Type assertion for the response data
        // Type guard to ensure the data is an array of Item objects
        if (Array.isArray(data.content)) {
          setResItems(data.content as []);
          setFlag(data.flag);
        } else {
          console.error("Invalid data format received from API");
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    }
    fetchItems();
  }, [searchText]);

  return (
    <Grid
      columns={4}
      aspectRatio={"3/2"}
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Zero}
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle={true}
      navigationTitle="Look up Wubi character roots."
      searchBarPlaceholder="Input the Pinyin of one Chinese character or word"
    >
      {flag === 0 && resItems.map((item) => <Grid.Item key={item} content={item} />)}
      {flag === 1 &&
        resItems.map((item: Item) => {
          return (
            <Grid.Section key={item.K} title={item.K}>
              {item.V.map((code) => (
                <Grid.Item key={`${code}-${Math.random()}`} content={code} />
              ))}
            </Grid.Section>
          );
        })}
    </Grid>
  );
}
