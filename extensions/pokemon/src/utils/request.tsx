import axios from "axios";

export async function Request(url: string, method = "GET", data: object | null, headers = {}) {
    try {
        const response = await axios({url, method, data, headers});
        return response.data;
    } catch (error) {
        throw error;
    }
}
