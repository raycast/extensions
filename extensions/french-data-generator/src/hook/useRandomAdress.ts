import { useFetch } from "@raycast/utils";

export function useRandomAddress() {
  // Fetching random French address using RandomUser API
  const { data, isLoading, revalidate } = useFetch("https://randomuser.me/api/?nat=fr", {
    parseResponse: async (response) => {
      const json = await response.json();
      const location = json.results[0].location;

      // Ensure the street number is within realistic bounds
      const streetNumber =
        location.street.number >= 1 && location.street.number <= 300
          ? location.street.number
          : Math.floor(Math.random() * 50) + 1;

      return `${streetNumber} ${location.street.name}, ${location.postcode} ${location.city}`;
    },
  });

  return { address: data, isLoading, revalidate };
}
