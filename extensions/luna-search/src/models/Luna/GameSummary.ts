import { Widget } from "./Reponse";

// The domain for the Luna platform
const LUNA_DOMAIN = "https://luna.amazon.com";

// The Raycast reference parameter to be added to the open and play URLs
const RAYCAST_REF = "&ref=tmp_raycast";

// The additional query parameters to be added to the open and play URLs
const LUNA_QUERY_PARAMS = `?g=web${RAYCAST_REF}`;

/**
 * Represents the summary of a game on the Luna platform.
 * The GameSummary class is responsible for mapping the data from the
 * Luna API response to a more convenient and type-safe representation.
 */
export class GameSummary {
  readonly detailToken: string;
  readonly imgUrl: string;
  readonly genres?: string[];
  readonly playUrl?: string;
  readonly publisher?: string;
  readonly openUrl: string;
  readonly ratingContent?: string[];
  readonly ratingDescription?: string;
  readonly ratingImageUrl?: string;
  readonly rawUrl: string;
  readonly title: string;

  /**
   * Constructs a new GameSummary instance from the provided Widget data.
   * The constructor extracts the relevant information from the Widget's
   * presentationData and sets the corresponding properties on the GameSummary.
   *
   * @param source The Widget object from the Luna API response.
   */
  constructor(source: Widget) {
    const content = JSON.parse(source.presentationData);

    this.detailToken = source.actions[0].serviceToken;
    this.imgUrl = content.imageLandscape;
    this.genres = content.genreTags;
    this.publisher = content.hoverDetails?.publishersText;
    this.ratingContent = content.hoverDetails?.ageRating?.contentDescription;
    this.ratingDescription = content.hoverDetails?.ageRating?.categoryText;
    this.ratingImageUrl = content.hoverDetails?.ageRating?.categoryImageUrl;
    this.title = content.title;
    this.openUrl = `${LUNA_DOMAIN}${source.actions[0].target}${LUNA_QUERY_PARAMS}`;
    this.playUrl = content.hoverDetails?.productUrl ? `${content.hoverDetails?.productUrl}${RAYCAST_REF}` : undefined;
    this.rawUrl = `${LUNA_DOMAIN}${source.actions[0].target}`;
  }
}
