import { Action } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { BASE_URL } from "../config";
import { DrinkBasicInfo, DrinkCompleteInfo } from "../types";

export default function OpenInBrowserAction({ drink }: { drink: DrinkBasicInfo | DrinkCompleteInfo }) {
  // the URL format: https://www.thecocktaildb.com/drink/ID-DASHED-NAME-Cocktail
  return (
    <Action.OpenInBrowser
      icon={getFavicon(BASE_URL)}
      title="View on TheCocktailDB"
      url={`${BASE_URL}drink/${drink.idDrink}-${drink.strDrink.replaceAll(" ", "-")}-Cocktail`}
    />
  );
}
