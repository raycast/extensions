import axios from "axios";
import cheerio from "cheerio";

export async function fetchContent(url: string) {
  return axios
    .get(url)
    .then((response) => {
      const $ = cheerio.load(response.data);
      const title = $('meta[property="og:title"]').attr("content") ?? "";
      const content = $("#page-content").text();
      return {
        title,
        content,
      };
    })
    .catch((error) => {
      console.error(error);
      return {
        title: "",
        content: "",
      };
    });
}
