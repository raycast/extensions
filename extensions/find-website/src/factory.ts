import {
  Adapter,
  ArcAdapterRecents,
  ArcAdapterTopVisited,
  ChromeAdapterRecents,
  ChromeAdapterTopVisited,
  OrionAdapterRecents,
  OrionAdapterTopVisited,
  SafariAdapterRecents,
  SafariAdapterTopVisited,
  FirefoxAdapterRecents,
  FirefoxAdapterTopVisited,
} from "./adapters";
import {
  OrionQueryBuilder,
  QueryBuilder,
  ChromeQueryBuilder,
  ArcQueryBuilder,
  SafariQueryBuilder,
  FirefoxQueryBuilder,
} from "./query-builder";
import { ChromeRecord, OrionRecord, Record, ArcRecord, SafariRecord, FirefoxRecord, ZenRecord } from "./record";
import { resolve } from "path";
import { homedir } from "os";
import ini from "ini";
import fs from "node:fs";

interface Configurations {
  chrome: Factory<ChromeRecord>;
  orion: Factory<OrionRecord>;
  arc: Factory<ArcRecord>;
  safari: Factory<SafariRecord>;
  firefox: Factory<FirefoxRecord>;
  zen: Factory<ZenRecord>;
  [key: string]: Factory<Record>;
}

export class Factory<T extends Record> {
  getQueryBuilder(): QueryBuilder {
    return new ChromeQueryBuilder();
  }
  getSrc(): string {
    return "";
  }
  getRecentsAdapter(): Adapter<T> {
    return new Adapter();
  }
  getTopVisitedAdapter(): Adapter<T> {
    return new Adapter();
  }

  static create(browser: string, profile: string): Factory<Record> {
    const config: Configurations = {
      chrome: new ChromeFactory(profile),
      orion: new OrionFactory(),
      arc: new ArcFactory(),
      safari: new SafariFactory(),
      firefox: new FirefoxFactory(),
      zen: new ZenFactory(),
    };

    return config[browser];
  }
}

class OrionFactory extends Factory<OrionRecord> {
  getQueryBuilder() {
    return new OrionQueryBuilder();
  }

  getRecentsAdapter(): Adapter<OrionRecord> {
    return new OrionAdapterRecents();
  }

  getTopVisitedAdapter(): Adapter<OrionRecord> {
    return new OrionAdapterTopVisited();
  }

  getSrc(): string {
    return resolve(homedir(), "Library/Application Support/Orion/Defaults/history");
  }
}

class SafariFactory extends Factory<SafariRecord> {
  getQueryBuilder() {
    return new SafariQueryBuilder();
  }

  getRecentsAdapter(): Adapter<SafariRecord> {
    return new SafariAdapterRecents();
  }

  getTopVisitedAdapter(): Adapter<SafariRecord> {
    return new SafariAdapterTopVisited();
  }

  getSrc(): string {
    return resolve(homedir(), "Library/Safari/History.db");
  }
}

class ArcFactory extends Factory<ArcRecord> {
  getSrc(): string {
    return resolve(homedir(), "Library/Application Support/Arc/User Data/Default/History");
  }

  getQueryBuilder(): QueryBuilder {
    return new ArcQueryBuilder();
  }

  getRecentsAdapter(): Adapter<ArcRecord> {
    return new ArcAdapterRecents();
  }
  getTopVisitedAdapter(): Adapter<ArcRecord> {
    return new ArcAdapterTopVisited();
  }
}

class ChromeFactory extends Factory<ChromeRecord> {
  profile: string;

  getQueryBuilder(): QueryBuilder {
    return new ChromeQueryBuilder();
  }

  getSrc(): string {
    return resolve(homedir(), `Library/Application Support/Google/Chrome/${this.profile}/History`);
  }

  constructor(profile: string) {
    super();
    this.profile = profile;
  }

  getRecentsAdapter(): Adapter<ChromeRecord> {
    return new ChromeAdapterRecents();
  }
  getTopVisitedAdapter(): Adapter<ChromeRecord> {
    return new ChromeAdapterTopVisited();
  }
}

class FirefoxFactory<T extends FirefoxRecord> extends Factory<T> {
  profile: string;

  constructor() {
    super();
    this.profile = this.getProfile();
  }

  getQueryBuilder(): QueryBuilder {
    return new FirefoxQueryBuilder();
  }

  getBaseDir(): string {
    return "Library/Application Support/Firefox";
  }

  getSrc(): string {
    return resolve(homedir(), `${this.getBaseDir()}/${this.profile}/places.sqlite`);
  }

  getRecentsAdapter(): Adapter<T> {
    return new FirefoxAdapterRecents();
  }
  getTopVisitedAdapter(): Adapter<T> {
    return new FirefoxAdapterTopVisited();
  }

  getProfile(): string {
    const file = fs.readFileSync(resolve(homedir(), `${this.getBaseDir()}/profiles.ini`), "utf8");
    const iniFile = ini.parse(file);

    const profiles = Object.keys(iniFile).map((key) => ({ name: iniFile[key].Name, path: iniFile[key].Path }));

    const installKey = Object.keys(iniFile).find((key) => key.startsWith("Install"));

    const defaultProfile: string = installKey ? iniFile[installKey]?.Default : profiles[0].path;
    return defaultProfile;
  }
}

class ZenFactory extends FirefoxFactory<ZenRecord> {
  getBaseDir(): string {
    return "Library/Application Support/zen";
  }
}
