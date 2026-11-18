import { DBSoundSet, DBSoundTile, SoundSet, SoundSetTile } from "@/types";

export class FarragoDataSource {
  db: {
    sets: Map<SoundSet["uuid"], DBSoundSet>;
    tiles: Map<SoundSetTile["tileUUID"], DBSoundTile>;
    tileUuidsByTitle: Record<SoundSetTile["title"], Set<SoundSetTile["tileUUID"]>>;
  };

  constructor() {
    this.db = { sets: new Map(), tiles: new Map(), tileUuidsByTitle: {} };
  }

  emptyDb() {
    this.db = { sets: new Map(), tiles: new Map(), tileUuidsByTitle: {} };
  }

  populateDb(soundSets: SoundSet[]) {
    for (const set of soundSets) {
      const dbSet: DBSoundSet = { ...set, tiles: [] };
      for (let i = 0; i < set.tiles.length; i++) {
        const tile: DBSoundTile = {
          ...set.tiles[i],
          set: { uuid: set.uuid, mode: set.mode, position: set.position }, // todo: decide
        };
        this.db.tiles.set(tile.tileUUID, tile);
        dbSet.tiles[i] = tile.tileUUID;
        this.db.tileUuidsByTitle[tile.title] ??= new Set();
        this.db.tileUuidsByTitle[tile.title].add(tile.tileUUID);
      }
      this.db.sets.set(dbSet.uuid, dbSet);
    }
  }

  // data operations

  getAllTiles() {
    return [...this.db.tiles.values()];
  }

  getAllSets() {
    return [...this.db.sets.values()];
  }

  getTileByUuid(tileUuid: string) {
    const tile = this.db.tiles.get(tileUuid);
    if (!tile) {
      throw new Error(`Tile not found for UUID ${tileUuid}`);
    }
    return tile;
  }

  getSetByUuid(setUuid: string) {
    const set = this.db.sets.get(setUuid);
    if (!set) {
      throw new Error(`Set not found for UUID ${setUuid}`);
    }
    return set;
  }

  getTilesWithTitle(title: string) {
    return this.db.tileUuidsByTitle[title] ?? new Set();
  }

  checkTileForDuplicateTitles(tile: DBSoundTile) {
    // todo: fix?
    if (!(tile.title in this.db.tileUuidsByTitle)) return false;
    // throw new Error(`UUIDs for "${tile.title}" expected in ${this.db.tileUuidsByTitle}`);

    return this.db.tileUuidsByTitle[tile.title].size > 1;
  }
}
