import { Color, Image, List } from "@raycast/api";
import type { JustWatchMedia, JustWatchMediaOffers } from "@/types";
import { MediaType } from "@/types";
import { getColor, getImdbRating, getParsedCurrency } from "@/utils";

type Props = {
  media: JustWatchMedia;
  offer: JustWatchMediaOffers;
  countryCode: string | null;
};

export const Detail = ({ media, offer, countryCode }: Props) => {
  return (
    <List.Item.Detail
      markdown={`<img height="185" src="${media.thumbnail}" />`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={"Title"} text={`${media.name} (${media.year})`} />
          {offer.type == MediaType.stream ? (
            <List.Item.Detail.Metadata.TagList title="Available for">
              <List.Item.Detail.Metadata.TagList.Item
                text={offer.type_parsed}
                color={getColor(offer.type)}
                icon={{ source: offer.icon, mask: Image.Mask.RoundedRectangle }}
              />
              <List.Item.Detail.Metadata.TagList.Item text={offer.presentationType} color={Color.Red} />
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <></>
          )}

          {offer.type == MediaType.buy || offer.type == MediaType.rent ? (
            <>
              <List.Item.Detail.Metadata.TagList title="Price">
                <List.Item.Detail.Metadata.TagList.Item
                  text={
                    `${offer.type_parsed} for ` +
                    getParsedCurrency(offer.priceAmount, offer.currency, countryCode) +
                    ` (${offer.presentationType})`
                  }
                  color={getColor(offer.type)}
                  icon={{ source: offer.icon, mask: Image.Mask.RoundedRectangle }}
                />
              </List.Item.Detail.Metadata.TagList>

              {offer.otherPrices && offer.otherPrices.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title={"Other Prices"}>
                  {offer.otherPrices.map((other_price) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={`${offer.name}-${other_price.presentationType}-${other_price.currency}-${other_price.priceAmount}-${media.id}`}
                      text={
                        getParsedCurrency(other_price.priceAmount, other_price.currency, countryCode) +
                        ` (${other_price.presentationType})`
                      }
                      color={Color.SecondaryText}
                      icon={{ source: offer.icon, mask: Image.Mask.RoundedRectangle }}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : (
                <></>
              )}
            </>
          ) : (
            <></>
          )}

          {offer.type == MediaType.free ? (
            <List.Item.Detail.Metadata.TagList title="Price">
              <List.Item.Detail.Metadata.TagList.Item
                text={"FREE"}
                color={getColor(offer.type)}
                icon={{ source: offer.icon, mask: Image.Mask.RoundedRectangle }}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <></>
          )}

          {!media.isMovie ? (
            <List.Item.Detail.Metadata.Label title={""} text={offer.seasons}></List.Item.Detail.Metadata.Label>
          ) : (
            <></>
          )}

          <List.Item.Detail.Metadata.Link
            title={"Platform"}
            text={offer.name}
            target={offer.url}
          ></List.Item.Detail.Metadata.Link>

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            text={getImdbRating(media, countryCode)}
            title={"Rating"}
            icon={"imdb.png"}
          ></List.Item.Detail.Metadata.Label>

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Link
            title={""}
            text={"View on JustWatch.com"}
            target={media.jwUrl}
          ></List.Item.Detail.Metadata.Link>
          <List.Item.Detail.Metadata.Link
            title={""}
            text={"View on IMDB"}
            target={media.imdbUrl}
          ></List.Item.Detail.Metadata.Link>
        </List.Item.Detail.Metadata>
      }
    />
  );
};
