import { List } from "@raycast/api";
import { DISPLAY_VALUES, LUNA_LOGO_IMG } from "../../constants";
import { LunaGame } from "../../services";

/**
 * Defines the props for the GameDetail component.
 */
interface Props {
  game: LunaGame;
  searchCallback: (query: string) => void;
}

/**
 * Optimizes the image URL for display by adding a size modifier to the URL.
 * This aligns with the optimization done by the Luna platform on its home screen.
 *
 * @param url The original image URL.
 * @param size The target size for the image, in pixels.
 * @returns The optimized image URL.
 */
function optimizeImageUrl(url: string, size: number) {
  const urlParts = url.split(".");
  urlParts.splice(urlParts.length - 1, 0, `_SX${size}_`);
  return urlParts.join(".");
}

/**
 * The GameDetail component is responsible for rendering the detailed
 * information about a specific game, including the game art, rating,
 * and genres.
 *
 * It receives the following props:
 * - game: The LunaGame instance to display.
 * - searchCallback: A function to be called when the user clicks on a genre.
 *
 * The component uses the List.Item.Detail component from the Raycast API
 * to display the game's metadata, including the image, rating, and genres.
 * If the game does not have an image URL, it falls back to the LUNA_LOGO_IMG.
 *
 * When a genre is clicked, the searchCallback function is called with the
 * selected genre as the argument.
 */
export function GameDetail({ game, searchCallback }: Props): JSX.Element {
  if (!game) return <></>;
  const img = game.imgUrl ? optimizeImageUrl(game.imgUrl, 300) : LUNA_LOGO_IMG;
  return (
    <List.Item.Detail
      markdown={`![Game Art](${img})`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title={DISPLAY_VALUES.metadataRatingTitle}
            icon={game.ratingImageUrl}
            text={game.ratingDescription}
          />
          <List.Item.Detail.Metadata.TagList title={DISPLAY_VALUES.metadataRatingContentTitle}>
            {game.ratingContent?.map((content) => (
              <List.Item.Detail.Metadata.TagList.Item color={DISPLAY_VALUES.lightGrey} key={content} text={content} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title={DISPLAY_VALUES.metadataGenreTitle}>
            {game.genres?.map((genre) => (
              <List.Item.Detail.Metadata.TagList.Item
                color={DISPLAY_VALUES.brandColor}
                key={genre}
                text={genre}
                onAction={() => {
                  searchCallback(genre);
                }}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}
