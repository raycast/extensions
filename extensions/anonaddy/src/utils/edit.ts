import { getApiKey } from "./key";
import fetch from "node-fetch";

export const editAlias = async (id: string, description: string | null = null) => {
    const res = await fetch(`https://app.anonaddy.com/api/v1/aliases/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getApiKey()}`,
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json",
        },
        body: JSON.stringify({
            description,
        }),
    });

    return res.status === 200;
};
