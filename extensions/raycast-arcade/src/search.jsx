import { List, ActionPanel, Action, launchCommand, LaunchType } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
export default function SearchGames() {
  let games = [
    {
      name: "Tetris",
      highlights: ["No-Modifier Controls", "ASCII", "High-Refresh Game", "Classic"],
      author: "EvanZhouDev",
      wikipedia: "Tetris",
      markdown: `
# Tetris

The classic block-stacking game, remade in Raycast!

Control the falling block with WASD, and clear as many lines as you can.
            `,
      commandName: "tetris",
      icon: "tetris.png",
    },
    {
      name: "Wordle",
      highlights: ["Color", "SVG", "Multi-Mode"],
      author: "EvanZhouDev",
      wikipedia: "Wordle",
      markdown: `
# Wordle

The famous word guessing game, replicated beautifully in Raycast.

You have 6 guesses to figure out a 5 letter word, with clues that reveal themselves along the way.

Modes:
1. *Daily Wordle*: Play the daily puzzle from New York Times. Get a new puzzle each day!
2. *Wordle Unlimited*: Finished the daily puzzle? Keep on playing! From the official list of possible words, Wordle Unlimited is an amazing experience.
            `,
      commandName: "wordle",
      icon: "wordle.png",
    },
    {
      name: "Chrome Dino",
      highlights: ["High-Refresh", "Classic", "ASCII", "Has Audio"],
      author: "EvanZhouDev",
      wikipedia: "Dinosaur_Game",
      markdown: `
# Chrome Dinosaur Game

The classic endless runner game!

Jump over cacti with enter, and try to survive as long as you can, while you move faster and faster.

How many points can you get?
            `,
      commandName: "dino",
      icon: "dinosaur.png",
    },
    {
      name: "2048",
      highlights: ["SVG", "Color", "Classic"],
      author: "EvanZhouDev",
      wikipedia: "2048_(video_game)",
      markdown: `
# 2048

A classic number game, beautifully replicated in Raycast.

Merge numbers with ⇪ + ←↑→↓ and try to get the 2048 tile!
            `,
      commandName: "game2048",
      icon: "2048.png",
    },
    {
      name: "Snake",
      highlights: ["ASCII", "High-Refresh", "Classic", "Modifier-Less"],
      author: "EvanZhouDev",
      wikipedia: "Snake_(video_game_genre)",
      markdown: `
# Snake

Move a snake around with WASD to eat apples!

Make sure not to bump into walls or your tail, or it's Game Over!
            `,
      commandName: "snake",
      icon: "snake.png",
    },
  ];
  return (
    <List isShowingDetail={true} searchBarPlaceholder="Search for your favorite game...">
      {games.map(({ name, highlights, author, wikipedia, markdown, commandName, icon }) => (
        <List.Item
          key={name}
          title={name}
          icon={icon}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Highlights">
                    {highlights.map((highlight) => (
                      <List.Item.Detail.Metadata.TagList.Item key={highlight} text={highlight} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Author" text={author} icon={getAvatarIcon(author)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="Wikipedia"
                    target={`https://en.wikipedia.org/wiki/${wikipedia}`}
                    text={name}
                  />
                </List.Item.Detail.Metadata>
              }
              markdown={markdown}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title={`Play ${name}`}
                onAction={async () => await launchCommand({ name: commandName, type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
