/** `npm run sync-favicons`: refresh the bundled favicons without probing the catalog again */
import { syncFavicons } from "./favicons";

await syncFavicons();
