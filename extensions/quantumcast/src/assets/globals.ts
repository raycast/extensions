import { cloudflowBaseUrl, userHomeDir } from "./preferences";

/**
 * Quantumcast Documentation globals
 */
export const docBaseUrl = "https://jcgerhard.gitbook.io/quantumcast";
export const docUrlGoToCollection = `${docBaseUrl}/manual/commands/go-to-collection`;
export const docUrlGoToWhitepaper = `${docBaseUrl}/manual/commands/go-to-whitepaper`;
export const docUrlGoToWorkspace = `${docBaseUrl}/manual/commands/go-to-workspace`;
export const docUrlGoToFolder = `${docBaseUrl}/manual/commands/go-to-folder`;
export const docUrlGoToFile = `${docBaseUrl}/manual/commands/go-to-file`;
export const docUrlCreateCustomObject = `${docBaseUrl}/manual/commands/create-custom-object`;
export const docUrlOpenAppBuilder = `${docBaseUrl}/manual/commands/open-appbuilder`;

/**
 * Cloudflow globals
 */
export const cloudflowCollectionsUrl = `${cloudflowBaseUrl}/mongoCloud/mongoCloud_nebula.html?collection=`;
export const cloudflowWhitepaperUrl = `${cloudflowBaseUrl}/portal.cgi?quantum&whitepaperName=`;
export const cloudflowAssetUrl = `${cloudflowBaseUrl}/portal.cgi?asset=`;
export const cloudflowAppBuilderUrl = `${cloudflowBaseUrl}/appnavigator/index.html?cfappName=`;
export const cloudflowAppDetailsUrl = `${cloudflowBaseUrl}/appsnebula/index.html#/details`;
export const cloudflowApiJsonUrl = `${cloudflowBaseUrl}/portal.cgi?api=json`;
export const cloudflowApiDocUrl = `${cloudflowBaseUrl}/?api=getJavaScriptDocumentation`;
export const cloudflowApiWebServiceUrl = `${cloudflowBaseUrl}/portal.cgi?api=getWebServiceDocumentation`;
export const cloudflowManualUrl = `${cloudflowBaseUrl}/manual/manual.html`;
export const cloudflowProofscopeUrl = `${cloudflowBaseUrl}/portal.cgi?proofscope&topbar=true&url=`;
export const cloudflowProofscopeFileTypes = [".pdf", ".jpg", ".bmp", ".cf2"];
//export const cloudflowWhereAreTheNodes = `/Applications/Cloudflow/220902_cloudflow_mac_lts_b45297/workers/Resource/WhereAreTheNodes.json`

/**
 * Packz globals
 */
export const packzPresetsBaseURL = "/Users/Shared/PACKZ Software/";
export const packzPresetsUrlUser = `${packzPresetsBaseURL}/User`;
export const packzPresetsUrlShared = `${packzPresetsBaseURL}/Shared`;
export const packzPresetsUrlCloudflow = `${packzPresetsBaseURL}/Cloudflow`;
export const packzFileTypes = [".pdf", ".ai", ".tiff", ".tif", ".jpg", ".png", ".psd", ".eps", ".ic3d"];

/**
 * Frame (Plugin-Suite) globals
 */
// export const framePresetsUrl = `${userHomeDir}/Documents/NiXPS/FrameWorkstationSetup.json`;
// New location from 22.12 on...
export const framePresetsUrl = `${userHomeDir}/Library/Application Support/Hybrid/FrameWorkstationSetup.json`;

/**
 * TRAC globals
 */
export const tracBaseUrl = "https://trac.hybridsoftware.com/hybrid";
export const tracQueryUrl = `${tracBaseUrl}/query`;
