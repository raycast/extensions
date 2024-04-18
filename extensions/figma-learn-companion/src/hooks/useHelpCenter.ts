import { useState } from "react";
import { Topic } from "../types";
import axios from "axios";
import { parse } from "node-html-parser";
import { Toast, showToast } from "@raycast/api";

export default function () {
    const [isLoading, setIsLoading] = useState(false);
    const [foundTopics, setFoundTopics] = useState<Topic[]>([]);

    async function searchHelpCenter(searchText: string) {
        // Reset the foundTopics and set the loading state to true before fetching the search results
        setFoundTopics([]);
        setIsLoading(true);
        let data;

        // Fetch the search results from the Figma help center
        try {
            data = await axios(`https://api.maxmckinney.com/api/figma/hc?search=${searchText}`, {});
        } catch (error) {
            showToast(Toast.Style.Failure, "Error", "Couldn't fetch the help center");
            console.error(error);
            setIsLoading(false);
            return;
        }

        // Parse the HTML and extract the search results
        const html = parse(data.data);
        const searchList: Topic[] = [];
        const searchResults = html.querySelectorAll(".search-result-list-item");
        // Extract the title, URL and category of each search result and add it to the searchList
        searchResults.map((result) => {
            const title = result.querySelector(".results-list-item-link")?.text;
            const url =
                "https://help.figma.com" + result.querySelector(".results-list-item-link")?.getAttribute("href");
            const category = result.querySelectorAll(".search-result-breadcrumbs li").pop()?.text;

            // If the title, URL and category are present, add it to the searchList, if not, skip it
            if (title && url && category) {
                searchList.push({ title, url, category });
            }
        });

        setFoundTopics([...searchList]);
        setIsLoading(false);
    }

    return {
        isLoading,
        searchHelpCenter,
        foundTopics,
    };
}
