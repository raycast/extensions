import { ActionPanel, Detail, Action, LaunchProps, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

interface Preferences {
  language?: string;
  country?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.OpenFoodFacts }>) {
  const [barcode, setBarcode] = useState("");

  const preferences = getPreferenceValues<Preferences>();
  const language = preferences.language;
  const country = preferences.country;

  useEffect(() => {
    // Initialize barcode state with the argument
    const { barcode } = props.arguments;
    setBarcode(barcode);
  }, [props.arguments]); // Corrected to use props.arguments

  const { isLoading, data, revalidate } = useFetch(
    `https://${country}.openfoodfacts.org/api/v3/product/${barcode}?cc=${language}&lc=${language}&tags_lc=${language}`,
  );

  // console.log(data);

  const categories = data?.product?.categories?.split(",") ?? [];

  const category = categories ? categories[categories.length - 1] : "";

  const brands = data?.product?.brands.split(",");
  const brand = brands ? brands[0] : "";

  const markdown = `# ${data?.product?.product_name} - ${brand}
      
  ![](${data?.product?.image_front_url})

  ## Brands
  ${data?.product?.brands}

  ## Categories
  ${data?.product?.categories}

  ## Labels
  ${data?.product?.labels}

  ## Nutrient Levels
  - Fat: ${data?.product?.nutrient_levels?.fat}
  - Saturated Fat: ${data?.product?.nutrient_levels?.saturated_fat}
  - Sugars: ${data?.product?.nutrient_levels?.sugars}
  - Salt: ${data?.product?.nutrient_levels?.salt}

  ## Nutriments for 100g
  - Energy: ${data?.product?.nutriments?.energy} ${data?.product?.nutriments?.energy_unit} / ${getKcal()}
  - Fat: ${data?.product?.nutriments?.fat} g
  - Saturated Fat: ${getSaturatedFat()}
  - Carbohydrates: ${data?.product?.nutriments?.carbohydrates} g
  - Sugar: ${data?.product?.nutriments?.sugars} g
  - Proteins: ${data?.product?.nutriments?.proteins} g
  - Salt: ${data?.product?.nutriments?.salt} g


  ## Ingredients
  ${data?.product?.ingredients_text}
  `;

  function getKcal() {
    if (data?.product?.nutriments["energy-kcal"]) {
      return `${data?.product?.nutriments["energy-kcal"]} kcal`;
    }
  }

  function getSaturatedFat() {
    if (data?.product?.nutriments["saturated-fat"]) {
      return `${data?.product?.nutriments["saturated-fat"]} g`;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${data?.product?.product_name}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Brand" text={data?.product?.brands} />
          {/* <Detail.Metadata.Label title="Quantity" text={data?.product?.quantity} /> */}
          <Detail.Metadata.Label title="Nutri-Score" text={data?.product?.nutriscore_grade.toUpperCase()} />
          <Detail.Metadata.Label title="NOVA Group" text={data?.product?.nova_group.toString()} />
          <Detail.Metadata.Label title="Ecoscore" text={data?.product?.ecoscore_grade.toUpperCase()} />
          <Detail.Metadata.Label title="Number of Additives" text={data?.product?.additives_n.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Category" text={category} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://${country}.openfoodfacts.org/product/${barcode}`} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action title="Reload" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}
