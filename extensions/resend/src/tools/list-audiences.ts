import { resend } from "../lib/resend";

const tool = async () => {
  return await resend.audiences.list();
};

export default tool;
