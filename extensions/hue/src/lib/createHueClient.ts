import { ClientHttp2Session, connect } from "http2";
import React from "react";
import { BridgeConfig, GroupedLight, Light, Room, Scene, Zone } from "./types";
import tls from "tls";
import fs from "fs";
import { environment } from "@raycast/api";
import dns from "dns";
import HueClient from "./HueClient";

const CONNECTION_TIMEOUT_MS = 5000;

export default async function createHueClient(
  bridgeConfig: BridgeConfig,
  setLights?: React.Dispatch<React.SetStateAction<Light[]>>,
  setGroupedLights?: React.Dispatch<React.SetStateAction<GroupedLight[]>>,
  setRooms?: React.Dispatch<React.SetStateAction<Room[]>>,
  setZones?: React.Dispatch<React.SetStateAction<Zone[]>>,
  setScenes?: React.Dispatch<React.SetStateAction<Scene[]>>
) {
  // TODO: Only do this if the certificate is self-signed
  const peerCertificate = await getCertificate(bridgeConfig.ipAddress);
  const cert = await createPemBuffer(peerCertificate);
  console.log("Peer certificate:", peerCertificate);
  if (peerCertificate.issuer.CN === bridgeConfig.id.toLowerCase()) {
    console.log(`Certificate belongs to Hue Bridge with id "${bridgeConfig.id}", converting to PEM format…`);
  }

  if (cert) {
    console.log("Connecting to Hue Bridge using self-signed certificate…");
  } else {
    console.log("Connecting to Hue Bridge and checking it's certificate against the Hue Bridge root CA…");
  }

  const http2Session = await new Promise<ClientHttp2Session>((resolve, reject) => {
    // Connect to the Hue Bridge using the Bridge ID as the hostname, which we then resolve to the Bridge IP address.
    const session = connect(`https://${bridgeConfig.id}`, {
      ca: cert ? cert : fs.readFileSync(environment.assetsPath + "/huebridge_cacert.pem"),
      checkServerIdentity: (hostname, cert) => {
        /*
         * If both the certificate issuer’s Common Name field, and the certificate subject’s Common Name field are
         * equal to the Bridge ID, the Bridge is running an older firmware version.
         * Source: https://developers.meethue.com/develop/application-design-guidance/using-https/#Self-signed%20certificates
         */
        // TODO: Skip fingerprint check since we're already checking against the entire certificate
        if (cert.issuer.CN === bridgeConfig.id.toLowerCase() && cert.subject.CN === bridgeConfig.id.toLowerCase()) {
          // console.log("Self-signed Hue Bridge certificate detected.");
          // LocalStorage.setItem(BRIDGE_CERT_FINGERPRINT, cert.fingerprint);
          // if (bridgeConfig.cert !== cert.fingerprint) {
          //   return new Error(
          //     "Server identity check failed. " +
          //       "Fingerprint does not match known fingerprint. " +
          //       "If you trust this certificate, please unlink and relink your Bridge."
          //   );
          // }
          // console.log(
          //   "Self-signed Hue Bridge certificate detected. " +
          //     "Certificate fingerprint matches known fingerprint. " +
          //     "Continuing connection."
          // );
          // Certificate is deemed valid, even though it is self-signed.
          return undefined;
        }

        /*
         * In case of a more up-to-date firmware version, we need to check the certificate’s Common Name field against
         * the bridgeId and check the certificate against the Hue Bridge Root CA.
         */
        if (cert.subject.CN === bridgeConfig.id.toLowerCase() && cert.issuer.CN === "root-bridge") {
          return undefined;
        } else {
          return new Error(
            "Server identity check failed. Certificate subject’s Common Name does not match bridgeId " +
              "or certificate issuer’s Common Name does not match “root-bridge”."
          );
        }
      },
      lookup: (hostname, options, callback) => {
        /*
         * Resolve the Bridge ID to the Bridge IP address to prevent the following warning:
         * [DEP0123] DeprecationWarning: Setting the TLS ServerName to an IP address is not permitted by RFC 6066.
         */
        if (hostname.toLowerCase() === bridgeConfig.id?.toLowerCase() && bridgeConfig.ipAddress !== undefined) {
          console.log(
            `Overriding DNS lookup for host name "${hostname}" (Bridge ID) to ${bridgeConfig.ipAddress} to avoid TLS ServerName IP warning.`
          );
          callback(null, bridgeConfig.ipAddress, 4);
        } else {
          dns.lookup(hostname, options, callback);
        }
      },
    });

    session.setTimeout(CONNECTION_TIMEOUT_MS, () => {
      reject(new Error("Connection timed out."));
    });

    session.once("connect", () => {
      resolve(session);
    });

    session.once("error", (error) => {
      reject(error);
    });
  });

  return new HueClient(bridgeConfig, http2Session, setLights, setGroupedLights, setRooms, setZones, setScenes);
}

function getCertificate(host: string): Promise<tls.PeerCertificate> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: host,
        port: 443,
        rejectUnauthorized: false,
      },
      () => {
        console.log("Getting certificate from the Hue Bridge…");
        socket.end();
        resolve(socket.getPeerCertificate());
      }
    );

    socket.on("error", (error) => {
      reject(error);
    });
  });
}

async function createPemBuffer(cert: tls.PeerCertificate): Promise<Buffer> {
  const insertNewlines = (str: string): string => {
    const regex = new RegExp(`(.{64})`, "g");
    return str.replace(regex, "$1\n");
  };
  const base64 = cert.raw.toString("base64");
  return Buffer.from(`-----BEGIN CERTIFICATE-----\n${insertNewlines(base64)}\n-----END CERTIFICATE-----\n`, "utf-8");
}
