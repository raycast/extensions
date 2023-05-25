import { Grid, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { apiUrl } from "./constants";
import { Offer, OfferNameQuery, OfferDataResponse } from "./interfaces";

import OfferActions from "./offerActions";

export default function Cards(props: LaunchProps<{ arguments: OfferNameQuery }>) {
  const { offerName } = props.arguments;

  const url = `${apiUrl}/search/offers/${offerName}`;

  const { isLoading, data } = useFetch(url);

  /*
  Data is in this format:

  {
    success: true,
    results: [
      {
        title: 'IKEA: Earn 10% cash back',
        slug: 'ikea-earn-10-cash-back-1',
        type: 'offer',
        subtitle: "This offer is awesome.",
        expired: false
      }
    ]
  }
  */

  const typedData = data as OfferDataResponse;
  const results = (typedData?.results ?? []) as Offer[];

  return (
    <Grid columns={3} isLoading={isLoading} searchBarPlaceholder={"Offer Name"} aspectRatio="4/3">
      <Grid.Section title={`Matching Offers: ${offerName} `}>
        {results?.map((offer) => (
          <Grid.Item
            key={offer.slug}
            id={`${offer.slug}`}
            title={offer.title}
            subtitle={offer.expired ? "Expired" : ""}
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
