import { Detail } from "@raycast/api";
import { AliyunDrive } from "@chyroc/aliyundrive";

export default (props: { data: AliyunDrive.ShareFileResp }) => {
  const { data } = props;

  let md = "";
  if (data.share_pwd) {
    md = `Share Link: ${data.share_url}\nShare Code: ${data.share_pwd}`;
  } else {
    md = `Share Link: ${data.share_url}`;
  }
  return <Detail markdown={md} />;
};
