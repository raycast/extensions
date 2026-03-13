import { useState } from "react";
import { Topic } from "../types";
import axios from "axios";
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
            data = await axios(`https://help.figma.com/api/v2/help_center/articles/search?query=${searchText}`, {});
        } catch (error) {
            showToast(Toast.Style.Failure, "Error", "Couldn't fetch the help center");
            console.error(error);
            setIsLoading(false);
            return;
        }

        const results = data.data;
        const searchList: Topic[] = [];
        // Loop through the search results and push them to the searchList array
        // The map needs to be async because we need to fetch the category name for each result, and that needs to be inside the Promise.all to make sure all the categories are fetched before setting the state
        await Promise.all(
            results.results.map(async (result: { title: string; html_url: string; section_id: number }) => {
                const title = result.title;
                const url = "https://help.figma.com" + result.html_url;
                const category = await getSectionName(result.section_id);
                searchList.push({ title, url, category });
            }),
        );

        setFoundTopics([...searchList]);
        setIsLoading(false);
    }

    return {
        isLoading,
        searchHelpCenter,
        foundTopics,
    };
}

async function getSectionName(fromId: number) {
    const data = await axios(`https://help.figma.com/api/v2/help_center/sections/${fromId}`, {});
    return data.data.section.name;
}
