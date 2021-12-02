import wiki from "wikijs";
import useSWR from "swr";

const wikipedia = wiki({
  apiUrl: "https://en.wikipedia.org/w/api.php",
});

export async function getRandomArticle() {
  const [title] = await wikipedia.random(1);
  return title;
}

async function findArticlesByTitle(search: string) {
  if (!search) {
    return [];
  }
  const { results } = await wikipedia.prefixSearch(search, 20);
  return results;
}

async function getArticleByTitle(title: string) {
  const page = await wikipedia.page(title);
  return {
    title: title,
    url: page.url(),
    summary: await page.summary()
  };
}

export function useWikipediaArticles(search: string) {
  return useSWR(["articles", search], () => findArticlesByTitle(search));
}

export function useWikipediaArticle(title?: string) {
  return useSWR(title ? ["article", title] : null, () => {
    if (title) {
      return getArticleByTitle(title);
    }
  });
}
