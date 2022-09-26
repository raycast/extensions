import { getApiKey } from "./key";
import fetch from "node-fetch";
export interface aliasObject {
    id: string;
    email: string;
    active: boolean;
    description: string | null;
}

interface listResponse {
    data: aliasObject[];
    meta: {
        total: number;
    };
}

export const listAllAliases = async () => {
    let pageNum = 1;

    let totalPages: number | undefined = undefined;

    let allAliases: aliasObject[] = [];

    while (totalPages === undefined || pageNum <= totalPages) {
        const res = await fetch(`https://app.anonaddy.com/api/v1/aliases?page[number]=${pageNum}`, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getApiKey()}`,
                "X-Requested-With": "XMLHttpRequest",
                Accept: "application/json",
            },
        });

        const data = (await res.json()) as listResponse;

        totalPages = Math.ceil(data.meta.total / 100);

        allAliases = allAliases.concat(data.data);

        pageNum++;
    }

    return allAliases;
};
