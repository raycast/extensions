import { runPlayFavoriteAndClose } from "./utils/playFavorite";

export default async function Command() {
  await runPlayFavoriteAndClose(3);
}
