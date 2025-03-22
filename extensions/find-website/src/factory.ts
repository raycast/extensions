import {
  Adapter,
  ArcAdapterRecents,
  ArcAdapterTopVisited,
  ChromeAdapterRecents,
  ChromeAdapterTopVisited,
  OrionAdapterRecents,
  OrionAdapterTopVisited,
} from "./adapters";
import { OrionQueryBuilder, QueryBuilder, ChromeQueryBuilder, ArcQueryBuilder } from "./query-builder";
import { ChromeRecord, OrionRecord, Record, ArcRecord } from "./record";
import { resolve } from "path";
import { homedir } from "os";

interface Configurations {
  chrome: Factory<ChromeRecord>;
  orion: Factory<OrionRecord>;
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
