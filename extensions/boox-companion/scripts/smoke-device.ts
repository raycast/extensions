import { BooxClient } from "../src/api/boox-client";

const host = process.argv[2];
if (!host) {
  console.error("Usage: npm run smoke:device -- http://BOOX-IP:8085");
  process.exit(2);
}

const client = new BooxClient(host, process.env.BOOX_PASSWORD);
const [device, storage, library, notes, media] = await Promise.all([
  client.getDevice(),
  client.listStorage("/", 0, 20),
  client.getLibrary({ limit: 20 }),
  client.getNotes({ limit: 20 }),
  client.getMediaCategories(),
]);
const populatedMedia = media.find((category) => category.count > 0);
const mediaItems = populatedMedia ? await client.getMediaList(populatedMedia.type, 0, 5) : undefined;

console.log(
  JSON.stringify(
    {
      model: device.model,
      screenAvailable: device.screenAvailable,
      storageItems: storage.count,
      libraryBooks: library.bookCount,
      libraryShelves: library.shelfCount,
      notes: notes.count,
      mediaCategories: media.length,
      sampledMediaItems: mediaItems?.list.length ?? 0,
    },
    null,
    2,
  ),
);
