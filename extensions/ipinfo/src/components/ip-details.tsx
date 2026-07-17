import { Detail } from "@raycast/api";
import { IPBogon, IPinfo, IPinfoLite } from "node-ipinfo/dist/src/common";
import { BogonIP } from "./bogon-ip";
import { constructMarkdown } from "../utils/markdown";
import { IPActions } from "./ip-actions";

type IpDetailsProps = {
  ipInfo: IPinfoLite | IPinfo | IPBogon | null;
  isLoading: boolean;
};

export const IpDetails = ({ ipInfo, isLoading }: IpDetailsProps) => {
  if (ipInfo && "bogon" in ipInfo && ipInfo.bogon) {
    return <BogonIP ipInfo={ipInfo as IPBogon} />;
  }

  const notBogonIp = ipInfo as IPinfoLite | IPinfo;

  return (
    <Detail
      markdown={!isLoading && notBogonIp ? constructMarkdown(notBogonIp) : ""}
      isLoading={isLoading}
      actions={<IPActions ipInfo={notBogonIp} allowFullLookup={!(notBogonIp as IPinfo)?.hostname} />}
    />
  );
};
