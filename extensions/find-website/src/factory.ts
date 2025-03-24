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
  BraveAdapterRecents,
  BraveAdapterTopVisited,
  VivaldiAdapterRecents,
  VivaldiAdapterTopVisited,
  OperaAdapterRecents,
  OperaAdapterTopVisited,
  EdgeAdapterRecents,
  EdgeAdapterTopVisited,
} from "./adapters";
import {
  OrionQueryBuilder,
  QueryBuilder,
  ChromeQueryBuilder,
  ArcQueryBuilder,
  SafariQueryBuilder,
  FirefoxQueryBuilder,
  BraveQueryBuilder,
  VivaldiQueryBuilder,
  OperaQueryBuilder,
  EdgeQueryBuilder,
} from "./query-builder";
import {
  ChromeRecord,
  OrionRecord,
  Record,
  ArcRecord,
  SafariRecord,
  FirefoxRecord,
  ZenRecord,
  BraveRecord,
  VivaldiRecord,
  OperaRecord,
  EdgeRecord,
} from "./record";
import { resolve } from "path";
import { homedir } from "os";
import ini from "ini";
import fs from "node:fs";

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
    switch (browser) {
      case "chrome":
        return new ChromeFactory(profile);
      case "orion":
        return new OrionFactory();
      case "arc":
        return new ArcFactory();
      case "safari":
        return new SafariFactory();
      case "firefox":
        return new FirefoxFactory();
      case "zen":
        return new ZenFactory();
      case "brave":
        return new BraveFactory();
      case "vivaldi":
        return new VivaldiFactory();
      case "opera":
        return new OperaFactory();
      case "edge":
        return new EdgeFactory();
      default:
        return new ChromeFactory(profile);
    }
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

class ChromeFactory<T extends ChromeRecord> extends Factory<T> {
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

  getRecentsAdapter(): Adapter<T> {
    return new ChromeAdapterRecents<ChromeRecord>();
  }
  getTopVisitedAdapter(): Adapter<T> {
    return new ChromeAdapterTopVisited();
  }
}

class BraveFactory extends ChromeFactory<BraveRecord> {
  constructor() {
    super("");
  }

  getQueryBuilder(): QueryBuilder {
    return new BraveQueryBuilder();
  }

  getRecentsAdapter(): Adapter<BraveRecord> {
    return new BraveAdapterRecents();
  }
  getTopVisitedAdapter(): Adapter<BraveRecord> {
    return new BraveAdapterTopVisited();
  }

  getSrc(): string {
    return resolve(homedir(), `Library/Application Support/BraveSoftware/Brave-Browser/Default/History`);
  }
}

class VivaldiFactory extends ChromeFactory<VivaldiRecord> {
  constructor() {
    super("");
  }

  getQueryBuilder(): QueryBuilder {
    return new VivaldiQueryBuilder();
  }

  getRecentsAdapter(): Adapter<VivaldiRecord> {
    return new VivaldiAdapterRecents();
  }
  getTopVisitedAdapter(): Adapter<VivaldiRecord> {
    return new VivaldiAdapterTopVisited();
  }

  getSrc(): string {
    return resolve(homedir(), `Library/Application Support/Vivaldi/Default/History`);
  }
}

class OperaFactory extends ChromeFactory<OperaRecord> {
  constructor() {
    super("");
  }

  getQueryBuilder(): QueryBuilder {
    return new OperaQueryBuilder();
  }

  getRecentsAdapter(): Adapter<OperaRecord> {
    return new OperaAdapterRecents();
  }
  getTopVisitedAdapter(): Adapter<OperaRecord> {
    return new OperaAdapterTopVisited();
  }

  getSrc(): string {
    return resolve(homedir(), `Library/Application Support/com.operasoftware.Opera/Default/History`);
  }
}

class EdgeFactory extends ChromeFactory<EdgeRecord> {
  constructor() {
    super("");
  }

  getQueryBuilder(): QueryBuilder {
    return new EdgeQueryBuilder();
  }

  getRecentsAdapter(): Adapter<EdgeRecord> {
    return new EdgeAdapterRecents();
  }
  getTopVisitedAdapter(): Adapter<EdgeRecord> {
    return new EdgeAdapterTopVisited();
  }

  getSrc(): string {
    return resolve(homedir(), `Library/Application Support/Microsoft Edge/Default/History`);
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
    return new FirefoxAdapterRecents<FirefoxRecord>();
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
