import axios from "axios";

// Interface pour une adresse
export interface Address {
  label: string;
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
}

// Fonction pour générer une requête de recherche aléatoire
export const getRandomSearchQuery = (): string => {
  const streetTypes = ["rue", "avenue", "boulevard", "place", "chemin"];
  const streetNames = ["de Paris", "de la République", "des Fleurs", "du Port", "Saint-Michel", "Victor Hugo"];
  const randomStreetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
  const randomStreetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const randomStreetNumber = Math.floor(Math.random() * 300) + 1;

  return `${randomStreetNumber} ${randomStreetType} ${randomStreetName}`;
};

// Fonction pour récupérer une adresse aléatoire
export const fetchRandomAddress = async (query: string): Promise<string | null> => {
  try {
    const response = await axios.get(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=housenumber&autocomplete=1&limit=1`,
    );

    const feature = response.data.features?.[0];
    if (feature) {
      const { properties } = feature;
      return (
        properties.label ||
        `${properties.housenumber || ""} ${properties.street}, ${properties.postcode} ${properties.city}`.trim()
      );
    }
    console.warn("[Address Utils] No valid address found.");
    return null;
  } catch (error) {
    console.error("[Address Utils] Error fetching address:", error);
    throw error;
  }
};
