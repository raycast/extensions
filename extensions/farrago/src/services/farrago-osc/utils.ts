import { DBSoundTile } from "@/types";

import { TileBaseAddress } from "./types";

export function getTileCoordinates(tile: DBSoundTile) {
  let tilePosition = { x: 0, y: 0 };
  if (tile.set.mode === 0) {
    // i.e. if it's a grid
    tilePosition = { x: tile.gridPositionX, y: tile.gridPositionY };
  } else {
    // if it's a list
    tilePosition.y = tile.listPositionY;
  }

  return { setPosition: tile.set.position, tilePosition };
}

export function getTileBaseAddress(tile: DBSoundTile): TileBaseAddress {
  const { setPosition, tilePosition } = getTileCoordinates(tile);
  return `/set/${setPosition}/tile/${tilePosition.x}/${tilePosition.y}`;
}
