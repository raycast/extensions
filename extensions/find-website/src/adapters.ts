import { Icon, Color, Image } from "@raycast/api";
import { Record, OrionRecord, ChromeRecord, ArcRecord, SafariRecord } from "./record";

class Result {
  key: string;
  title: string;
  subtitle: string;
  icon: { value: Image.ImageLike | null | undefined; tooltip: string };
  accessories: object[];
  url: string;

  constructor(
    key: string,
    title: string,
    subtitle: string,
    icon: { value: Image.ImageLike | null | undefined; tooltip: string },
    accessories: object[],
    url: string,
  ) {
    this.key = key;
    this.title = title;
    this.subtitle = subtitle;
    this.icon = icon;
    this.accessories = accessories;
    this.url = url;
  }
}

export class Adapter<T extends Record> {
  adapt(record: T, i: number): Result {
    return new Result(
      this.getKey(i),
      this.getTitle(record),
      this.getSubtitle(record),
      this.getIcon(),
      this.getAccessories(record),
      this.getUrl(record),
    );
  }

  getKey(i: number): string {
    return i.toString();
  }

  getTitle(record: T): string {
    if (record.title == null || record.title == undefined) return "";

    return record.title;
  }

  getSubtitle(record: T): string {
    return record.url;
  }

  getIcon(): { value: Image.ImageLike | null | undefined; tooltip: string } {
    return { value: Icon.Warning, tooltip: "" };
  }

  getAccessories(record: T): object[] {
    return [record];
  }

  getUrl(record: T): string {
    return record.url;
  }
}

class AdapterTopVisited<T extends Record> extends Adapter<T> {
  getKey(i: number): string {
    return `${i}_tv`;
  }

  getIcon(): { value: Image.ImageLike | null | undefined; tooltip: string } {
    return { value: Icon.Star, tooltip: "Top visited" };
  }

  getAccessories(record: T): object[] {
    return [{ tag: { value: record.visitCount.toString(), color: Color.Yellow }, tooltip: "Visit count" }];
  }
}

class AdapterRecents<T extends Record> extends Adapter<T> {
  getIcon(): { value: Image.ImageLike | null | undefined; tooltip: string } {
    return { value: Icon.RotateAntiClockwise, tooltip: "Recents" };
  }

  getKey(i: number): string {
    return `${i}_r`;
  }

  getAccessories(record: T): object[] {
    return [{ tag: { value: this.getVisitTime(record), color: Color.Magenta }, tooltip: "Last visited" }];
  }

  getVisitTime(record: T): string {
    return record.id.toString();
  }
}

export class OrionAdapterTopVisited extends AdapterTopVisited<OrionRecord> {
  getVisitTime(record: OrionRecord): string {
    return record.lastVisitTime.toString();
  }
}

export class OrionAdapterRecents extends AdapterRecents<OrionRecord> {}

export class ChromeAdapterRecents extends AdapterRecents<ChromeRecord> {
  getVisitTime(record: ChromeRecord): string {
    return record.lastVisitTime.toString();
  }
}

export class ChromeAdapterTopVisited extends AdapterTopVisited<ChromeRecord> {}

export class ArcAdapterTopVisited extends AdapterTopVisited<ArcRecord> {}

export class ArcAdapterRecents extends AdapterRecents<ArcRecord> {}

export class SafariAdapterTopVisited extends AdapterTopVisited<SafariRecord> {}

export class SafariAdapterRecents extends AdapterRecents<SafariRecord> {
  getVisitTime(record: SafariRecord): string {
    return record.visitTime.toString();
  }
}
