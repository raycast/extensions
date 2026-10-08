/** @module CallHandler */
import Env from "./Env";
import GitLogger from "./GitLogger";
import ShortcutFinder from "./ShortcutFinder";
import UrlProcessor from "./UrlProcessor";

/** Handle a call. */

export default class CallHandler {
  /**
   * The 'main' function of this class.
   */
  static async handleCall() {
    const targetDomain = document.querySelector("#targetDomain") as any;
    targetDomain.textContent = "";

    const env = new Env({ context: "process" });
    const params = Env.getParamsFromUrl();
    await env.populate(params);
    new GitLogger(env.gitInfo).logVersion();

    if (env.debug) {
      env.logger.showLog();
    }

    let redirectUrl: any;

    const response: AnyObject = this.getRedirectResponse(env);

    if (response.status === "found") {
      redirectUrl = response.redirectUrl;
    } else {
      redirectUrl = this.getRedirectUrlToHome(env, response);
    }

    targetDomain.textContent = response.redirectUrl;

    env.logger.info("Redirect to:   " + redirectUrl);

    if (env.debug) {
      return;
    }

    window.location.replace(redirectUrl);
  }

  /**
   * Given the environment, get a response object, incl. redirect URL.
   *
   * @param {object} env        - The environment.
   *
   * @return {object} response  - Contains redirect URL, status.
   */
  static getRedirectResponse(env: AnyObject) {
    const response: AnyObject = {};

    if (env.reload && !env.query) {
      response.status = "reloaded";
      return response;
    }

    if (!env.query) {
      response.status = "not_found";
      response.redirectUrl = false;
      return response;
    }

    const shortcut = ShortcutFinder.findShortcut(env);

    if (!shortcut) {
      response.status = "not_found";
      return response;
    }

    if (shortcut.deprecated) {
      response.status = "deprecated";
      response.alternative = this.getAlternative(shortcut, env);
      return response;
    }

    if (shortcut.removed) {
      response.status = "removed";
      response.key = shortcut.key;
      return response;
    }

    if (!shortcut.reachable) {
      response.status = "not_reachable";
      response.namespace = shortcut.namespace;
      return response;
    }

    response.redirectUrl = shortcut.url;
    response.status = "found";

    env.logger.info("Used template: " + response.redirectUrl);

    response.redirectUrl = UrlProcessor.replaceVariables(response.redirectUrl, {
      language: env.language,
      country: env.country,
    });
    response.redirectUrl = UrlProcessor.replaceArguments(response.redirectUrl, env.args, env);

    return response;
  }

  static getAlternative(shortcut: AnyObject, env: AnyObject) {
    let alternative = shortcut.deprecated.alternative.query;
    for (const i in env.args) {
      alternative = alternative.replace("<" + (parseInt(i) + 1) + ">", env.args[i]);
    }
    return alternative;
  }

  /**
   * Redirect in case a shortcut was not found.
   *
   * @param {string} status       - The status of the call.
   *
   * @return {string} redirectUrl - Redirect URL to the homepage, with parameters.
   */
  static getRedirectUrlToHome(env: AnyObject, response: AnyObject) {
    const params: AnyObject = Env.getParamsFromUrl();
    if (params.query === "reload" || params.query === "debug:reload") {
      delete params.query;
    }
    for (const property of ["alternative", "key", "namespace", "status"]) {
      if (response[property]) {
        params[property] = response[property];
      }
    }
    const paramStr = env.buildUrlParamStr(params);
    const redirectUrl = "../index.html#" + paramStr;
    return redirectUrl;
  }
}
