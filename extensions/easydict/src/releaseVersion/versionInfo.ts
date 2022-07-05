/*
 * @author: tisfeng
 * @createTime: 2022-07-01 19:05
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-04 23:29
 * @fileName: versionInfo.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LocalStorage } from "@raycast/api";
import axios from "axios";
import { requestCostTime } from "../request";
import { changelog } from "./changelog";

const versionInfoKey = "EasydictVersionInfoKey";
const githubUrl = "https://github.com";
const githubApiUrl = "https://api.github.com";

export class Easydict {
  static author = "tisfeng";
  static repo = "Raycast-Easydict";

  // new version info
  // * NOTE: this is new version info, don't use it directly. Use getCurrentStoredVersionInfo() instead.
  version = "1.2.0";
  buildNumber = 3;
  versionDate = "2022-07-04";
  isNeedPrompt = true;
  hasPrompted = false; // only show once, then will be set to true
  releaseMarkdown = changelog;

  getRepoUrl() {
    return `${githubUrl}/${Easydict.author}/${Easydict.repo}`;
  }

  getReadmeUrl() {
    return `${githubUrl}/${Easydict.author}/${Easydict.repo}/#readme`;
  }

  getIssueUrl() {
    return `${githubUrl}/${Easydict.author}/${Easydict.repo}/issues`;
  }

  getCurrentReleaseTagUrl() {
    return `${this.getRepoUrl()}/releases/tag/${this.version}`;
  }

  /**
   * Chinese Wiki: https://github.com/tisfeng/Raycast-Easydict/wiki
   */
  public getChineseWikiUrl() {
    return `${this.getRepoUrl()}/wiki`;
  }

  /**
   *  Release tag url: /repos/{owner}/{repo}/releases/tags/{tag}
   *
   *  https://api.github.com/repos/tisfeng/Raycast-Easydict/releases/tags/1.2.0
   */
  public getReleaseApiUrl() {
    return `${githubApiUrl}/repos/${Easydict.author}/${Easydict.repo}/releases/tags/${this.version}`;
  }

  /**
   * Store current version info.
   */
  private storeCurrentVersionInfo() {
    const jsonString = JSON.stringify(this);
    const currentVersionKey = `${versionInfoKey}-${this.version}`;
    return LocalStorage.setItem(currentVersionKey, jsonString);
  }

  /**
   * Get version info with version key, return a promise EasydictInfo.
   */
  async getVersionInfo(versionKey: string): Promise<Easydict | undefined> {
    const jsonString = await LocalStorage.getItem<string>(versionKey);
    if (!jsonString) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(JSON.parse(jsonString));
  }

  /**
   * Get current version info, return a promise EasydictInfo.
   */
  async getCurrentVersionInfo(): Promise<Easydict> {
    const startTime = Date.now();
    const currentVersionKey = `${versionInfoKey}-${this.version}`;
    const currentEasydictInfo = await this.getVersionInfo(currentVersionKey);
    if (currentEasydictInfo) {
      // console.log(`get current easydict cost time: ${Date.now() - startTime} ms`);
      return Promise.resolve(currentEasydictInfo);
    } else {
      const startStoredTime = Date.now();
      await this.storeCurrentVersionInfo();
      console.log(`store version cost time: ${Date.now() - startStoredTime} ms`);
      console.log(`store and get current version cost time: ${Date.now() - startTime} ms`);
      return Promise.resolve(this);
    }
  }

  /**
   * Fetch release markdown, return a promise string.
   * First, fetech markdown from github, if failed, then read from localStorage.
   *
   * * NOTE: if fetch markdown from github success, then will store `this`(Easydict) to localStorage.
   */
  public async fetchReleaseMarkdown(): Promise<string> {
    try {
      console.log("fetch release markdown from github");
      const releaseInfo = await this.fetchReleaseInfo(this.getReleaseApiUrl());
      const releaseMarkdown = releaseInfo.body;
      console.log("fetch release markdown from github success");
      if (releaseMarkdown) {
        this.releaseMarkdown = releaseMarkdown;
        this.hasPrompted = true; // need to set hasPrompted to true when user viewed `ReleaseDetail` page.
        this.storeCurrentVersionInfo(); // store the value to local storage.
        return Promise.resolve(releaseMarkdown);
      } else {
        console.log("fetch release markdown from github failed");
        return this.getLocalStoredMarkdown();
      }
    } catch (error) {
      console.error(`fetch release markdown error: ${error}`);
      console.log(`use local storaged markdown`);
      return this.getLocalStoredMarkdown();
    }
  }

  /**
   * Get local stored markdown, return a promise string.
   */
  public async getLocalStoredMarkdown(): Promise<string> {
    const currentVersionInfo = await this.getCurrentVersionInfo();
    return Promise.resolve(currentVersionInfo.releaseMarkdown);
  }

  /**
   * Use axios to get github latest release, return a promise
   */
  public fetchReleaseInfo = async (releaseUrl: string) => {
    try {
      // console.log(`fetch release url: ${releaseUrl}`);
      const response = await axios.get(releaseUrl);
      console.log(`fetch github cost time: ${response.headers[requestCostTime]} ms`);

      return Promise.resolve(response.data);
    } catch (error) {
      return Promise.reject(error);
    }
  };
}
