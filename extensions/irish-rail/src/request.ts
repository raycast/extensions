import axios from "axios";
import crypto from "crypto";
import https from "https";

const allowLegacyRenegotiationforNodeJsOptions = {
  httpsAgent: new https.Agent({
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  }),
};

export function makeRequest(url: string) {
  return axios({
    ...allowLegacyRenegotiationforNodeJsOptions,
    url,
    headers: {
      Accept: "application/xml",
    },
    method: "GET",
  });
}
