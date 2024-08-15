import { Color, Detail, Icon, showToast, Toast } from "@raycast/api";
import { DISPLAY_VALUES, LUNA_LOGO_IMG } from "../constants";
import { GameSummary, LunaService } from "../services";
import { GameActions } from "./GameActions";
import { useEffect, useState } from "react";
import { Game } from "../services/LunaService/Game";
import { SearchCallback } from "..";

const LUNA = LunaService.getInstance();

/**
 * Defines the props for the GameDetail component.
 */
interface Props {
  game: GameSummary;
  searchCallback: SearchCallback;
}

/**
 * Optimizes the image URL for display by adding a size modifier to the URL.
 * This aligns with the optimization done by the Luna platform on its home screen.
 *
 * @param url The original image URL.
 * @param size The target size for the image, in pixels.
 * @returns The optimized image URL.
 */
export function optimizeImageUrl(url: string, size: number) {
  const urlParts = url.split(".");
  urlParts.splice(urlParts.length - 1, 0, `_SX${size}_`);
  return urlParts.join(".");
}

/**
 * The GameDetail component is responsible for rendering the detailed
 * information about a specific game.
 *
 * It receives the following props:
 * - game: The LunaGame instance to display.
 *
 * The component uses the Detail component from the Raycast API
 * to display the game's metadata, including the image, rating, and genres and more.
 * If the game does not have an image URL, it falls back to the LUNA_LOGO_IMG.
 *
 * When a genre / publisher is clicked, the searchCallback function is called with the
 * selected item as the argument.
 */
export function GameDetail({ game, searchCallback }: Props): JSX.Element {
  if (!game) return <></>;

  const [gameDetails, setGameDetails] = useState<Game>();
  const [isLoading, setIsLoading] = useState<boolean>();

  useEffect(() => {
    setIsLoading(true);
    const loadDetails = async () => {
      try {
        const details = await LUNA.getGameDetails(game);
        setGameDetails(details);
      } catch (e) {
        console.debug("Error getting game details:", e);
        showToast({
          style: Toast.Style.Failure,
          title: DISPLAY_VALUES.errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadDetails();
  }, []);

  const img = game.imgUrl ? optimizeImageUrl(game.imgUrl, 500) : LUNA_LOGO_IMG;
  return (
    <Detail
      actions={<GameActions game={game} searchCallback={searchCallback} />}
      isLoading={isLoading}
      markdown={`
![Game Art](${img}?raycast-width=500)
 # ${game.title}

 ${gameDetails?.description ?? ""}
 `}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={DISPLAY_VALUES.metadataRatingTitle}
            icon={game.ratingImageUrl}
            text={game.ratingDescription}
          />
          <Detail.Metadata.TagList title={DISPLAY_VALUES.metadataRatingContentTitle}>
            {game.ratingContent?.map((content) => (
              <Detail.Metadata.TagList.Item color={Color.SecondaryText} key={content} text={content} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title={DISPLAY_VALUES.metadataGenreTitle}>
            {game.genres?.map((genre) => (
              <Detail.Metadata.TagList.Item
                color={Color.Purple}
                key={genre}
                text={genre}
                onAction={() => {
                  searchCallback({ query: genre });
                }}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title={DISPLAY_VALUES.releaseDateTitle}
            icon={Icon.Calendar}
            text={gameDetails?.releaseYear}
          />
          <Detail.Metadata.TagList title={DISPLAY_VALUES.publishersTitle}>
            {gameDetails?.publishers?.map((publisher) => (
              <Detail.Metadata.TagList.Item
                color={Color.PrimaryText}
                key={publisher}
                text={publisher}
                onAction={() => {
                  searchCallback({ query: publisher });
                }}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title={DISPLAY_VALUES.developersTitle}>
            {gameDetails?.developers?.map((developer) => (
              <Detail.Metadata.TagList.Item
                color={Color.PrimaryText}
                key={developer}
                text={developer}
                onAction={() => {
                  searchCallback({ query: developer });
                }}
              />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      navigationTitle={game.title}
    />
  );
}
