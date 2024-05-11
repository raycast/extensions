import { List, Icon, Color, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { baseApiConfig, baseApiBody } from "../utils/dbQueries";
import { chargingQueryObject } from "../utils/chargesDbStatements";
import { formatDuration } from "../utils/timeFormatter";
import { coordinatesConverter } from "../utils/coordinatesConverter";
import { getAddress, getAddress4, getAddresses2, getAddress3, getAddress100 } from "./getAddress";
import { useState, useEffect } from "react";
import fetch from "cross-fetch";

export default function Charges() {
  const [chargingData, setChargingData] = useState<{
    isLoading: boolean;
    data: any;
    error?: string;
  }>({
    isLoading: true,
    data: null,
  });

  const [addresses, setAddresses] = useState<{
    isLoading: boolean;
    data: any;
    error?: string;
  }>({
    isLoading: true,
    data: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(baseApiConfig.url, {
          method: baseApiConfig.method,
          headers: baseApiConfig.headers,
          body: JSON.stringify(baseApiBody(chargingQueryObject)),
        });

        if (response.ok) {
          const data = await response.json();

          setChargingData({ isLoading: false, data: data });

          // Extract coordinates
          const long = (data as any).results.charges_info.frames[0].data.values[11];
          const lat = (data as any).results.charges_info.frames[0].data.values[10];

          const combinedCoordinates = long.map((lng: number, index: number) => [lng, lat[index]]);

          const addressData = await getAddressWithDelay(combinedCoordinates, 0);

          if (addressData) {
            setAddresses({ isLoading: false, data: addressData });
          }
        } else {
          throw new Error("Failed to fetch data");
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
        setChargingData({ isLoading: false, data: null });
      }
    };

    fetchData();
  }, []);

  return (
    <List isLoading={addresses.isLoading}>
      {addresses.data ? (
        <List.Item title={addresses.data.display_name} />
      ) : (
        <List.Item title="No address data available" />
      )}
    </List>
  );
}

async function getAddressWithDelay(
  coordinatesList: [number, number][],
  delayInMilliseconds: number,
): Promise<{ [key: string]: string }[]> {
  const results = await Promise.all(
    coordinatesList.map(async (coordinates, index) => {
      const [lat, lon] = coordinates;

      await new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);

      if (!response.ok) {
        throw new Error(`Failed to fetch address for coordinates: ${lat}, ${lon}`);
      }

      const data = await response.json();
      return { [`${lat}-${lon}`]: data.display_name };
    }),
  );

  return results;
}
