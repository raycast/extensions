import { getApiKey } from "./key";
import fetch from "node-fetch";
import type { Response } from "node-fetch";

export const toggleAlias = async (id: string, newState: boolean) => {
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
    };

    const res = await fetch(`https://app.anonaddy.com/api/v1/active-aliases/${id}`, {
        method: newState ? "POST" : "DELETE",
        headers,
        body: JSON.stringify({
            id,
        }),
    });

    return res.status === (newState ? 200 : 204);
};
