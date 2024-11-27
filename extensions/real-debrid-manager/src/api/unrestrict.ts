import { UNRESTRICT_LINK, fetch } from ".";
import { ErrorResponse, UnrestrictLinkResponse } from "../schema";

import { AxiosResponse, AxiosError } from "axios";
import { formatErrorMessage } from "../utils";

export const requestLinkUnrestrict = async (link: string) => {
  try {
    const response: AxiosResponse<UnrestrictLinkResponse> = await fetch.post(
      UNRESTRICT_LINK,
      { link },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data as UnrestrictLinkResponse;
  } catch (e) {
    const axiosError = e as AxiosError<ErrorResponse>;
    const { message, error } = axiosError?.response?.data as ErrorResponse;
    throw new Error(formatErrorMessage(error || (message as string)));
  }
};
