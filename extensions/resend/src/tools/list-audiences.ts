import { Resend } from "resend";
import { API_KEY } from "../utils/constants";

const resend = new Resend(API_KEY);

const tool = async () => {
  return await resend.audiences.list();
};

export default tool;
