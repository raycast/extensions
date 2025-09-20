import axios from "axios";

import { License, APIResponse } from "../types";
import { BASE_URL } from "../utils/constants";

export const validateLicense = async (key: string) => {
  const url = `${BASE_URL}/api/sdb/license/fetchByKey?key=${key}`;
  let data: License | null = null;
  let message = null;

  try {
    const res = await axios.get<APIResponse<License>>(url);
    if (res.status === 200 && res.data) {
      data = res.data.data;
    }
  } catch (err) {
    message = err;
  }

  return {
    data,
    error: !!message,
    message,
  };
};
