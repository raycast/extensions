import { LunaResponse, Widget } from "./Reponse";

const EMPTY_JSON = "{}";
// ID of the Widget containing game details.
const GAME_DETAILS_ID = "item_game_details";

/**
 * Game represents a more detailed version of a given game.
 */
export class Game {
  readonly title: string;
  readonly description: string;
  readonly developers: string[];
  readonly publishers: string[];
  readonly releaseYear: string;

  /**
   * Constructs a new Game instance from the provided Widget data.
   * The constructor extracts the relevant information from the Response's
   * presentationData and sets the corresponding properties on the LunaGame.
   *
   * @param source The Response object from the Luna API.
   */
  constructor(data: LunaResponse) {
    const presentationData = JSON.parse(
      (
        data.pageMemberGroups.mainContent.widgets.find((widget: Widget) => widget.id === GAME_DETAILS_ID) ?? {
          presentationData: EMPTY_JSON,
        }
      ).presentationData
    );

    this.title = presentationData.title;
    this.description = presentationData.description;
    this.developers = presentationData.developers;
    this.publishers = (presentationData.publishersText ?? "").split(", ");
    this.releaseYear = presentationData.releaseYear;
  }
}
