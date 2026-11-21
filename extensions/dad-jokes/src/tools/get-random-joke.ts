import { fetchRandomJoke } from "../api";

/**
 * Fetch a random dad joke from icanhazdadjoke.com
 */
export default async function tool() {
  const joke = await fetchRandomJoke();
  return joke.joke;
}
