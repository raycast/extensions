// Removed unnecessary code comments and corrected setting addresses as an object instead of an array
import { useState, useEffect } from "react";
import { getAddress3, getAddress5 } from "./getAddress";
import { List } from "@raycast/api";
import fetch from "cross-fetch";

const newLong = 10.425463;
const newLat = 55.390716;

export default function Testt() {
  const [addresses, setAddresses] = useState<{
    isLoading: boolean;
    data: any;
    error?: string;
  }>({
    isLoading: true,
    data: null,
  });

  useEffect(() => {
    console.log("Now im inside useEffect");
    const fetchCurrentMatch = async () => {
      const adress = await getAddress3(newLong, newLat);

      if (adress) {
        const response = await adress;
        const data = await response;

        console.log("data uden for setAddresses");
        console.log(data);

        setAddresses((oldState) => ({
          ...oldState,
          isLoading: false,
          data: data,
        }));

        console.log("prøver med selve use state");
        console.log(await addresses); // Log the already fetched data directly

        // Continue with the rest of your code
      }
    };

    fetchCurrentMatch();
  }, []);

  return (
    <List isLoading={addresses.isLoading} searchBarPlaceholder="Filter articles by name...">
      {addresses.data ? (
        <List.Item title={addresses.data.display_name} />
      ) : (
        <List.Item title="No address data available" subtitle={"lkmasdklm"} />
      )}
    </List>
  );
}
