import axios from "axios";
import { DollarResponse, CryptoPriceResponse, StablePriceResponse } from "./types/types";

const axiosInstance = axios.create({
  timeout: 10000, // 10 seconds
});

export const CANCELED = Symbol("CANCELED");

type ApiResponse<T> = T | typeof CANCELED;

const handleAxiosError = (error: unknown): typeof CANCELED => {
  if (axios.isCancel(error)) {
    return CANCELED;
  }
  if (axios.isAxiosError(error)) {
    throw new Error(`Axios Error: ${error.response?.statusText || error.message}`);
  } else if (error instanceof Error) {
    throw new Error(`Error: ${error.message}`);
  } else {
    throw new Error("An unknown error occurred");
  }
};

export const fetchDollarRates = async (signal: AbortSignal): Promise<ApiResponse<DollarResponse>> => {
  try {
    const response = await axiosInstance.get<DollarResponse>("https://criptoya.com/api/dolar", { signal });
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

export const fetchBtcPrice = async (signal: AbortSignal): Promise<ApiResponse<CryptoPriceResponse>> => {
  try {
    const response = await axiosInstance.get<CryptoPriceResponse>(
      "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD",
      { signal },
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

export const fetchEthPrice = async (signal: AbortSignal): Promise<ApiResponse<CryptoPriceResponse>> => {
  try {
    const response = await axiosInstance.get<CryptoPriceResponse>(
      "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD",
      { signal },
    );
    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};

export const fetchUsdtPrice = async (signal: AbortSignal): Promise<ApiResponse<StablePriceResponse>> => {
  try {
    const response = await axiosInstance.get<StablePriceResponse>("https://criptoya.com/api/binancep2p/usdt/ars/0.1", {
      signal,
    });

    return response.data;
  } catch (error) {
    return handleAxiosError(error);
  }
};
