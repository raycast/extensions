import axios from "axios";

import { Session } from "../types";
import { BASE_URL } from "../utils/constants";

export const getSessionList = async (accountId: string) => {
  const url = `${BASE_URL}/api/sdb/session/fetchByAccountId?accountId=${accountId}`;
  let data: Session[] = [];
  let message = null;

  try {
    const res = await axios.get<Session[]>(url);
    if (res.status === 200) {
      data = res.data;
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
