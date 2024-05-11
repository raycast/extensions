import { useFetch } from "@raycast/utils";
import fetch from "cross-fetch";

interface AddressData {
  address: {
    town: string;
    road: string;
    postcode: string;
  } | null;
}

export async function getAddress4(long: number[], lat: number[]): Promise<any> {
  console.log("IM inside getAddress4");
  const coordinates = long.map((lng, index) => {
    return [lng, lat[index]];
  });

  try {
    const data = coordinates.map((coord) => {
      console.log("im checking these long and lat", coord[0], coord[1]);
      return fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coord[1]}&lon=${coord[0]}&format=json`)
        .then((response) => response.json())
        .then((data) => {
          console.log("Response from API:", data);
          return data;
        });
    });

    const responses = await Promise.all(data);

    const addresses = responses.map((address) => {
      const town = address?.address?.town || " ";
      const road = address?.address?.road || " ";
      const zipCode = address?.address?.postcode || " ";

      return `${road} ${town} ${zipCode}`;
    });

    console.log("address444444", addresses);

    return addresses;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null; // or handle the error as needed
  }
}

export async function getAddress3(long: number, lat: number) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=55.390716&lon=10.425463&format=json`);

    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    return null; // or handle the error as needed
  }
}

export async function getAddress5() {
  const long = [9.120404, 10.419311, 9.127345, 10.429988];

  const lat = [55.703983, 55.394946, 55.704065, 55.395022];

  console.log("IM inside getAddress4");
  const coordinates = long.map((lng, index) => {
    return [lng, lat[index]];
  });

  try {
    const data = coordinates.map((coord) => {
      console.log("im checking these long and lat", coord[0], coord[1]);
      return fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coord[1]}&lon=${coord[0]}&format=json`)
        .then((response) => response.json())
        .then((data) => {
          console.log("Response from API:", data);
          return data;
        });
    });

    const responses = await Promise.all(data);

    const addresses = responses.map((address) => {
      const town = address?.address?.town || " ";
      const road = address?.address?.road || " ";
      const zipCode = address?.address?.postcode || " ";

      return `${road} ${town} ${zipCode}`;
    });

    console.log("address444444", addresses);

    return addresses;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null; // or handle the error as needed
  }
}

export async function getAddress100(
  coordinatesList: [number, number][],
  delayInMilliseconds: number,
): Promise<{ [key: string]: string }[]> {
  const results = await Promise.all(
    coordinatesList.map(async (coordinates, index) => {
      const [lat, lon] = coordinates;

      // Introduce a delay between each API call
      await new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);

      console.log(`Response ${index + 1}:`);
      console.log("the response headers is", response.headers);
      console.log("the response status is", response.status);
      console.log("the response data is", response.body);

      const data = await response.json();
      return { [`${lat}-${lon}`]: data.display_name };
    }),
  );

  return results;
}

export async function getAddresses2(long: number[], lat: number[]) {
  const coordinates = long.map((lng, index) => {
    return [lng, lat[index]];
  });

  console.log("checking coordinates", coordinates);

  const promises = coordinates.map((coord) => {
    // console.log("checking coordinates", coord[0], coord[1]);
    return useFetch<AddressData>(
      `https://nominatim.openstreetmap.org/reverse?lat=${coord[1]}&lon=${coord[0]}&format=json`,
    );
  });

  const responses = await Promise.all(promises);

  const addresses = responses.map((data) => {
    const town = data?.data?.address?.town || " ";
    const road = data?.data?.address?.road || " ";
    const zipCode = data?.data?.address?.postcode || " ";

    return `${road} ${town} ${zipCode}`;
  });

  console.log(addresses);

  return addresses;
}

export function getAddress(long: number, lat: number) {
  const { data: addressData } = useFetch<AddressData>(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${long}&format=json`,
  );

  const town = addressData?.address?.town || " ";
  const road = addressData?.address?.road || " ";
  const zipCode = addressData?.address?.postcode || " ";
  const address = `${road} ${town} ${zipCode}`;

  return address;
}
