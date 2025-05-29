import path from "node:path";
import { platform, tmpdir } from "node:os";
import fs from "node:fs";
import { sleep } from "@salesforce/kit";
import {
  AuthInfo,
  AuthRemover,
  Connection,
  OAuth2Config,
  Org,
  SfdcUrl,
  WebOAuthServer,
  SfProject,
  OrgAuthorization,
} from "@salesforce/core";
import isWsl from "is-wsl";
import { execSync } from "node:child_process";
import { open } from "@raycast/api";
import { getString, isObject } from "@salesforce/ts-types";
import { AuthenticateNewOrgFormData, DeveloperOrg } from "../types";
import { HOME_PATH } from "../constants";

export async function getOrgList(): Promise<DeveloperOrg[]> {
  process.env["SF_DISABLE_LOG_FILE"] = "true";
  const authInfos = await AuthInfo.listAllAuthorizations();

  // Get detailed org info for each authorization
  const orgsPromises = authInfos.map(async (orgAuthorization: OrgAuthorization) => {
    const { username } = orgAuthorization;

    const authInfo = await AuthInfo.create({ username });
    // Get the fields directly from AuthInfo
    const fields = authInfo.getFields(true); // Pass true to get all fields

    return {
      alias: orgAuthorization.aliases && orgAuthorization.aliases.length > 0 ? orgAuthorization.aliases[0] : username,
      username,
      instanceUrl: orgAuthorization.instanceUrl ?? "",
      expirationDate: fields.expirationDate,
    };
  });

  const orgs = await Promise.all(orgsPromises);
  return orgs;
}

async function executeLoginFlow(oauthConfig: OAuth2Config): Promise<AuthInfo> {
  const oauthServer = await WebOAuthServer.create({ oauthConfig });
  try {
    await oauthServer.start();
    await open(oauthServer.getAuthorizationUrl());
    return oauthServer.authorizeAndSave();
  } catch (err) {
    throw "You already have an open OAuth process. Please go back and complete that process or wait 5 minutes and try again.";
  }
}

export async function authorizeOrg(toAuth: AuthenticateNewOrgFormData) {
  process.env["SF_DISABLE_LOG_FILE"] = "true";
  const oauthConfig: OAuth2Config = {
    loginUrl: await resolveLoginUrl(toAuth.url),
  };
  const authInfo = await executeLoginFlow(oauthConfig);
  await authInfo.handleAliasAndDefaultSettings({
    alias: toAuth.alias,
    setDefault: false,
    setDefaultDevHub: false,
  });
  const fields = authInfo.getFields(true);
  await AuthInfo.identifyPossibleScratchOrgs(fields, authInfo);
  return fields;
}

export async function openOrg(orgAlias: string, openToURL: string = HOME_PATH) {
  process.env["SF_DISABLE_LOG_FILE"] = "true";

  const getFileContents = (
    authToken: string,
    instanceUrl: string,
    // we have to defalt this to get to Setup only on the POST version.  GET goes to Setup automatically
    retUrl = openToURL,
  ): string => `
  <html>
    <body onload="document.body.firstElementChild.submit()">
      <form method="POST" action="${instanceUrl}/secur/frontdoor.jsp">
        <input type="hidden" name="sid" value="${authToken}" />
        <input type="hidden" name="directBridge2" value="true" />
        <input type="hidden" name="retURL" value="${retUrl}" /> 
      </form>
    </body>
  </html>`;

  const fileCleanup = (tempFilePath: string): void =>
    fs.rmSync(tempFilePath, { force: true, maxRetries: 3, recursive: true });

  const buildFrontdoorUrl = async (org: Org, conn: Connection): Promise<string> => {
    await org.refreshAuth(); // we need a live accessToken for the frontdoor url
    const accessToken = conn.accessToken;
    const instanceUrl = org.getField<string>(Org.Fields.INSTANCE_URL);
    const instanceUrlClean = instanceUrl.replace(/\/$/, "");
    return `${instanceUrlClean}/secur/frontdoor.jsp?sid=${accessToken}`;
  };
  // try {

  const targetOrg = await Org.create({ aliasOrUsername: orgAlias });
  const conn = targetOrg.getConnection();
  // const env = new Env();
  const [frontDoorUrl, retUrl] = await Promise.all([buildFrontdoorUrl(targetOrg, conn), openToURL]);

  const url = `${frontDoorUrl}${retUrl ? `&retURL=${retUrl}` : ""}`;

  // const orgId = targetOrg.getOrgId();

  // const username = targetOrg.getUsername() as string;

  await new SfdcUrl(url).checkLightningDomain();

  // create a local html file that contains the POST stuff.
  const tempFilePath = path.join(tmpdir(), `org-open-${new Date().valueOf()}.html`);
  await fs.promises.writeFile(
    tempFilePath,
    getFileContents(
      conn.accessToken as string,
      conn.instanceUrl,
      // the path flag is URI-encoded in its `parse` func.
      // For the form redirect to work we need it decoded.
      retUrl,
    ),
  );

  const filePathUrl = isWsl
    ? "file:///" + execSync(`wslpath -m ${tempFilePath}`).toString().trim()
    : `file:///${tempFilePath}`;
  try {
    open(filePathUrl);
  } catch (error) {
    fileCleanup(tempFilePath);
    console.error(error);
  }
  // so we don't delete the file while the browser is still using it
  // open returns when the CP is spawned, but there's not way to know if the browser is still using the file
  await sleep(platform() === "win32" || isWsl ? 7000 : 5000);
  fileCleanup(tempFilePath);
}

export async function deleteOrg(username: string) {
  process.env["SF_DISABLE_LOG_FILE"] = "true";
  const remover = await AuthRemover.create();
  await remover.removeAuth(username);
}

const resolveLoginUrl = async (instanceUrl?: string): Promise<string> => {
  const loginUrl = instanceUrl ?? (await getLoginUrl());
  throwIfLightning(loginUrl);
  return loginUrl;
};

/** try to get url from project if there is one, otherwise use the default production URL  */
const getLoginUrl = async (): Promise<string> => {
  try {
    const project = await SfProject.resolve();
    const projectJson = await project.resolveProjectConfig();
    return getString(projectJson, "sfdcLoginUrl", SfdcUrl.PRODUCTION);
  } catch (err) {
    const message: string = (isObject(err) ? Reflect.get(err, "message") ?? err : err) as string;
    console.error(message);
    return SfdcUrl.PRODUCTION;
  }
};
const throwIfLightning = (urlString: string): void => {
  const url = new SfdcUrl(urlString);
  if (url.isLightningDomain() || (url.isInternalUrl() && url.origin.includes(".lightning."))) {
    // throw new SfError(messages.getMessage('lightningInstanceUrl'), 'LightningDomain', [
    //   messages.getMessage('flags.instance-url.description'),
    // ]);
    console.error("Something bad happened in common.");
  }
};
