import axios, {AxiosResponse} from "axios";
import {Coin} from "../types/coin";
import {API_ENDPOINT, DEFAULT_CURRENCY_CRYPTO, DEFAULT_CURRENCY_FIAT} from "../enum";

const instance = axios.create({
    baseURL: API_ENDPOINT,
    headers: {"Content-type": "application/json"}
});

const responseBody = (response: AxiosResponse) => response.data;


const requests = {
    get: (url: string) => instance.get(url).then(responseBody),
};

export const getCoins = {
    getAllCoins: (): Promise<Coin> => requests.get("coins"),
    getCoinDetails: (id: string): Promise<Coin> => requests.get(`tickers/${id}?quotes=${DEFAULT_CURRENCY_FIAT},${DEFAULT_CURRENCY_CRYPTO}`)
};
