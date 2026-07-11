import { getResend, withResend } from "../lib/oauth";

const tool = async () => {
  const resend = getResend();
  return await resend.audiences.list();
};

export default withResend(tool);
