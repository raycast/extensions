import { Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { apiUrl } from "./utils/constants";
import { Offer, OfferDataResponse } from "./utils/interfaces";

import OfferActions from "./components/offerActions";

export default function TopOffers() {
  const url = `${apiUrl}/offers/`;

  const { isLoading, data } = useFetch(url);

  /*
  Data is in this format:

  {
    success: true,
    results: [
      {
        title: 'Chase Sapphire Reserve',
        slug: 'chase-sapphire-reserve',
        type: 'card',
        subtitle: "This card is awesome.",
        expired: false
      }
    ]
  }
  */

  const typedData = data as OfferDataResponse;
  const results = (typedData?.offers ?? []) as Offer[];

  return (
    <Grid columns={3} isLoading={isLoading} aspectRatio="4/3">
      <Grid.Section title="Newest Offers">
        {results?.map((offer) => (
          <Grid.Item
            key={offer.slug}
            id={`${offer.slug}`}
            title={offer.title}
            content={{
              source: `https://images.cardpointers.com/images/offers/${offer.slug}.png`,
            }}
            actions={
              <OfferActions
                offer={offer}
                showViewDetails={true}
                showCopyTextTitle="Copy Title"
                copyTextValue={offer.title}
              />
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
