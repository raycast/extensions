import { Icon, Color, Image } from "@raycast/api";
import { Record, OrionRecord, ChromeRecord, ArcRecord } from "./record";

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
  adapt(record: T): Result {
    return new Result(
      this.getKey(record),
      this.getTitle(record),
      this.getSubtitle(record),
      this.getIcon(),
      this.getAccessories(record),
      this.getUrl(record),
    );
  }

  getKey(record: T): string {
    return record.id.toString();
  }

  getTitle(record: T): string {
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
  getKey(record: T): string {
    return `${record.id}_tv`;
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

  getKey(record: T): string {
    return `${record.id}_r`;
  }

  getAccessories(record: T): object[] {
    return [{ tag: { value: record.lastVisitTime.toString(), color: Color.Magenta }, tooltip: "Last visited" }];
  }
}

export class OrionAdapterTopVisited extends AdapterTopVisited<OrionRecord> {}

export class OrionAdapterRecents extends AdapterRecents<OrionRecord> {}

export class ChromeAdapterRecents extends AdapterRecents<ChromeRecord> {}

export class ChromeAdapterTopVisited extends AdapterTopVisited<ChromeRecord> {}

export class ArcAdapterTopVisited extends AdapterTopVisited<ArcRecord> {}

export class ArcAdapterRecents extends AdapterRecents<ArcRecord> {}
