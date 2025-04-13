import { Resend } from "resend";
import { API_KEY } from "../utils/constants";
import "cross-fetch/polyfill";

const resend = new Resend(API_KEY);

const tool = async () => {
  return await resend.audiences.list();
};

export default tool;
