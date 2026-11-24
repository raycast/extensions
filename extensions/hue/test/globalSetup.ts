// Generates the certificates the fake bridges serve, once per run, so none are committed and none expire.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestProject } from "vitest/node";

export const BRIDGE_ID = "001788fffe000001";

// LibreSSL and OpenSSL 3 both read this, where their default configs differ. LibreSSL ignores -subj with it.
const config = (commonName: string) => `
[req]
distinguished_name = dn
prompt = no
[dn]
CN = ${commonName}
[ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
[leaf]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
extendedKeyUsage = serverAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid
`;

declare module "vitest" {
  export interface ProvidedContext {
    certDir: string;
  }
}

export default function setup(project: TestProject) {
  const dir = mkdtempSync(join(tmpdir(), "hue-test-certs-"));
  const openssl = (args: string) => execFileSync("openssl", args.split(" "), { cwd: dir, stdio: "pipe" });
  const key = (name: string, commonName: string) => {
    writeFileSync(join(dir, `${name}.cnf`), config(commonName));
    openssl(`ecparam -genkey -name prime256v1 -noout -out ${name}.key`);
  };

  const ca = (name: string, commonName: string) => {
    key(name, commonName);
    openssl(`req -new -x509 -sha256 -days 2 -config ${name}.cnf -extensions ca -key ${name}.key -out ${name}.pem`);
  };
  let serial = 1;
  const leaf = (name: string, commonName: string, issuer: string) => {
    key(name, commonName);
    openssl(`req -new -config ${name}.cnf -key ${name}.key -out ${name}.csr`);
    openssl(`x509 -req -sha256 -days 2 -in ${name}.csr -CA ${issuer}.pem -CAkey ${issuer}.key -set_serial ${serial++} -extfile ${name}.cnf -extensions leaf -out ${name}.pem`); // prettier-ignore
  };

  // The extension reads the Hue roots from environment.assetsPath, which test/setup.ts points here.
  ca("huebridge_cacert", "Test Hue root");
  leaf("bridge", BRIDGE_ID, "huebridge_cacert");
  leaf("impostor", "001788fffe0000ff", "huebridge_cacert");
  ca("foreign", "Test foreign root");
  leaf("foreign-bridge", BRIDGE_ID, "foreign");

  project.provide("certDir", dir);
  return () => rmSync(dir, { recursive: true, force: true });
}
