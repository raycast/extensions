import axios, { AxiosInstance, AxiosError, AxiosResponse, AxiosRequestConfig } from "axios";
import config from "../config";
import * as auth from "../auth";

interface ErrorResponse {
  message: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public data?: any,
    public config?: AxiosRequestConfig,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: config?.api,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(async (config) => {
      const token = await auth.getToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      } else {
        // Redirect to the auth page if there is no token
        await auth.authorize();
        const newToken = await auth.getToken();
        config.headers["Authorization"] = `Bearer ${newToken}`;
      }
      return config;
    });

    this.axiosInstance.interceptors.response.use(this.handleSuccess, this.handleError.bind(this));
  }

  private handleSuccess(response: AxiosResponse): AxiosResponse {
    return response;
  }

  private handleError = (error: AxiosError): Promise<never> => {
    if (error.response) {
      const apiError = new ApiError(
        error.response.status,
        (error.response.data as ErrorResponse).message || "An error occurred",
        error.response.data,
        error.config,
      );
      return this.centralErrorHandler(apiError);
    } else if (error.request) {
      return this.centralErrorHandler(new ApiError(0, "No response received from server", undefined, error.config));
    } else {
      return this.centralErrorHandler(new ApiError(0, error.message, undefined, error.config));
    }
  };

  private centralErrorHandler = async (error: ApiError): Promise<never> => {
    console.error(`API Error ${error.status}: ${error.message}`, error.data);

    if (error.status === 401) {
      auth.logout();
      await auth.authorize();
    }

    return this.axiosInstance.request(error.config || {});
  };

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

export default ApiClient.getInstance().getAxiosInstance();
