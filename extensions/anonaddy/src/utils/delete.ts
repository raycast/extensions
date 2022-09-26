import { getApiKey } from "./key";
import fetch from "node-fetch";

export const deleteAlias = async (id: string) => {
    const res = await fetch(`https://app.anonaddy.com/api/v1/aliases/${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getApiKey()}`,
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json",
        },
    });

    return res.status === 204;
};
